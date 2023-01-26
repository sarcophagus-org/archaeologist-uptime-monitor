import { multiaddr } from "@multiformats/multiaddr";
import express, { Request, Response } from "express";
import { getWeb3Interface } from "./utils/web3-interface";
import { p2pNode, startService } from "./start-service";
import { logging } from "./utils/logger";

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

    const addresses = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
    const profiles = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);
    const wssProfiles = profiles.filter(profile => profile.peerId.split(":").length === 2);
    logging.debug(`Number of profiles: ${wssProfiles.length}`);

    let dials = 0;
    let fails = 0;

    await new Promise<void>((resolve, reject) => {
      logging.error("---STARTING---");
      wssProfiles.forEach(async profile => {
        logging.notice(`dial ${profile.peerId.slice(profile.peerId.length - 5, profile.peerId.length)}`);
        const peerIdParts = profile.peerId.split(":");

        const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
        try {
          const res = await p2pNode.dial(addr);
          if (res) {
            dials++;
          }

          p2pNode.hangUp(addr);
        } catch (e) {
          fails++;
          logging.debug(`could not dial ${profile.peerId}`);
        }

        if (dials + fails === wssProfiles.length) {
          resolve();
        }
      });
    });

    logging.notice(`Dials: ${dials}`);
    logging.notice(`Fails: ${fails}`);
  } catch (e) {
    logging.debug(e);
  }
});
