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
    const archaeologists: ArchWithIsOnline[] = wssProfiles.map(p => ({ profile: p, connectionStatus: false }));

    logging.error("---DIALING ARCHAEOLOGISTS---");
    // for (let arch of archaeologists) {
    //   const peerIdParts = arch.profile.peerId.split(":");
    //   try {
    //     const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
    //     const res = await p2pNode.dial(addr);

    //     if (res) {
    //       dials++;
    //     }

    //     p2pNode.hangUp(addr);
    //     arch.connectionStatus = true;
    //   } catch (e) {
    //     // fails++;
    //     // arch.connectionStatus = false;
    //     // logging.debug(`could not dial ${arch.profile.peerId}`);

    //     if (e.errors[0].type === 'aborted') {
    //       aborts++;
    //       console.log(peerIdParts);
    //     }
    //     else fails++;
    //   }
    // }

    await new Promise<void>(resolve => {
      let failedNodes: Multiaddr[] = [];
      const tryDial = async (arch: ArchWithIsOnline, addr) => {
        const node = await createAndStartNode(new NodeConfig().configObj);

        try {
          const res = await node.dial(addr);
          if (res) {
            dials++;
            arch.connectionStatus = true;
          }

          node.hangUp(addr);
        } catch (e) {
          fails++;
          failedNodes.push(addr);
        }
      };
      archaeologists.map(async arch => {
        const profile = arch.profile;

        const interimNode = await createAndStartNode(new NodeConfig().configObj);
        const peerIdParts = profile.peerId.split(":");

        const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
        await tryDial(arch, addr);
        interimNode.stop();

        if (dials + fails === wssProfiles.length) {
          let totalRetries = 0;
          while (fails) {
            totalRetries++;
            console.log(`retrying ${failedNodes.length} failed dials`);

            await new Promise<void>(resolve => {
              let retries = 0;

              let abortedNodesLength = failedNodes.length;
              let abortedNodesCopy = [...failedNodes];
              failedNodes = [];

              abortedNodesCopy.forEach(async addr => {
                fails--;
                await tryDial(arch, addr);
                retries++;

                if (retries === abortedNodesLength) resolve();
              });
            });

            console.log("done retrying");
            if (totalRetries === 5) break;
          }

          resolve();
        }
      });
    });

    logging.notice(`Dials: ${dials}`);
    logging.notice(`Fails: ${fails}`);
    logging.error("---FINSISHED DIALING ARCHAEOLOGISTS---");
  } catch (e) {
    logging.debug(e);
    // console.log(e);
  }
});
