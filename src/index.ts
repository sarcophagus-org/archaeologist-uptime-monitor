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
    startService().then(async () => {
      const web3Interface = await getWeb3Interface();

      const addresses = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
      const profiles = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);

      profiles.forEach(profile => {
        logging.notice(`dial ${profile.peerId.slice(profile.peerId.length - 5, profile.peerId.length)}`);
        const peerIdParts = profile.peerId.split(":");
        if (peerIdParts.length !== 2) return;

        const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
        // logging.debug('start dial');
        p2pNode
          .dial(addr)
          .then(res => {
            // console.log(res);
          })
          .catch(e => {
            console.log(profile.peerId, e);
          })
          .finally(() => p2pNode.hangUp(addr));
      });
    });
  } catch (e) {
    logging.debug(e);
  }
});
