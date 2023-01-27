import { Multiaddr, multiaddr } from "@multiformats/multiaddr";
import express, { Request, Response } from "express";
import { getWeb3Interface } from "./utils/web3-interface";
import { p2pNode, startService } from "./start-service";
import { logging } from "./utils/logger";
import { ArchaeologistProfile } from "lib/types/arch-profile";
import { createAndStartNode } from "./p2p-node";
import { NodeConfig } from "./utils/node-config";

interface ArchWithIsOnline {
  profile: any;
  connectionStatus: boolean;
}

const app = express();
const port = 4000;

app.get("/", (req: Request, res: Response) => {
  res.send("Monitor online");
});

app.get("/online-archaeologists", (req: Request, res: Response) => {
  res.send([{ id: "peerId" }]);
});

app.listen(port, async () => {
  logging.debug("App start");
  try {
    await startService();

    const web3Interface = await getWeb3Interface();

    const addresses: string[] = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
    const profiles: ArchaeologistProfile[] = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);
    const wssProfiles = profiles.filter(profile => profile.peerId.split(":").length === 2);

    let dials = 0;
    let fails = 0;
    let failedNodes: Record<string, { arch: ArchWithIsOnline; addr: Multiaddr } | undefined> = {};

    const archaeologists: ArchWithIsOnline[] = wssProfiles.map(p => ({ profile: p, connectionStatus: false }));

    logging.error("---DIALING ARCHAEOLOGISTS---");

    const tryDial = async (arch: ArchWithIsOnline, addr) => {
      const node = await createAndStartNode(new NodeConfig().configObj);

      try {
        const res = await node.dial(addr);
        if (res) {
          dials++;
          arch.connectionStatus = true;
        }
        if (failedNodes[arch.profile.peerId]) {
          failedNodes[arch.profile.peerId] = undefined;
        }

        node.hangUp(addr);
      } catch (e) {
        fails++;
        failedNodes[arch.profile.peerId] = { addr, arch };
      }
    };

    // INITIAL DIAL
    await new Promise<void>(resolve => {
      archaeologists.map(async arch => {
        const profile = arch.profile;

        const interimNode = await createAndStartNode(new NodeConfig().configObj);
        const peerIdParts = profile.peerId.split(":");

        const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
        await tryDial(arch, addr);
        interimNode.stop();

        if (dials + fails === wssProfiles.length) {
          resolve();
        }
      });
    });

    // RETRY FAILS FROM INITAIL DIAL
    let totalRetries = 0;
    while (fails) {
      totalRetries++;
      let failedNodesLength = Object.values(failedNodes).filter(val => !!val).length;
      console.log(`retrying ${failedNodesLength} failed dials`);

      await new Promise<void>(resolve => {
        let retries = 0;

        Object.keys(failedNodes).forEach(async peerId => {
          if (failedNodes[peerId]) {
            fails--;
            await tryDial(failedNodes[peerId]!.arch, failedNodes[peerId]!.addr);
            retries++;

            if (retries === failedNodesLength) resolve();
          }
        });
      });

      if (totalRetries === 5) break;
    }

    logging.notice(`Dials: ${dials}`);
    logging.notice(`Fails: ${fails}`);
    logging.error("---FINSISHED DIALING ARCHAEOLOGISTS---");
  } catch (e) {
    logging.debug(e);
    // console.log(e);
  }
});
