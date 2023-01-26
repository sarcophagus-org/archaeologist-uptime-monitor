import { multiaddr } from "@multiformats/multiaddr";
import express, { Request, Response } from "express";
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
    startService().then(
      async () => {
        // const addr = multiaddr(`/ip4/127.0.0.1/tcp/9000/wss/p2p/12D3KooWPr29ZXECDFXe91s7sY7kKXJGguuwf47krWi6gKPZTBea`);
        const addr = multiaddr(`/dns4/arch-dsk.co.uk/tcp/443/wss/p2p/12D3KooWPr29ZXECDFXe91s7sY7kKXJGguuwf47krWi6gKPZTBea`);
        logging.debug('start dial');
        const res = await p2pNode.dial(addr);
        logging.debug('finish dial');
        console.log(res);
        await p2pNode.hangUp(addr);
        logging.debug('hang up');
      });
  } catch (e) {
    logging.debug(e);
  }
});
