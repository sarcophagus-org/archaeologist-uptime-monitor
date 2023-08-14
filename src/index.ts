import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOfflineNodesAddresses, getOnlineNodes, getUptimeStats } from "./utils/db";
import { SubgraphData } from "./graph/subgraph";

import { TypedEthereumSigner } from "arbundles";
import { isHexString } from "ethers/lib/utils";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Monitor online");
});

app.get("/online-archaeologists", (req: Request, res: Response) => {
  getOnlineNodes()
    .then(onlineList => res.send(onlineList))
    .catch(() => res.status(500));
});

app.get("/uptime-stats", (req: Request, res: Response) => {
  getUptimeStats()
    .then(stats => res.send(stats))
    .catch(() => res.status(500));
});

app.get("/offline-archaeologists", (req: Request, res: Response) => {
  getOfflineNodesAddresses()
    .then(offlineList => res.send(offlineList))
    .catch(() => res.status(500));
});

const allowedDomains = ["app.dev.sarcophagus.io", "app.sarcophagus.io"];

app.get("/bundlr/publicKey", async (req: Request, res: Response) => {
  if (!allowedDomains.includes(req.headers.host ?? "")) {
    res.status(403).json({ error: "Access Forbidden" });
  }

  const key = process.env.BUNDLR_PAYMENT_PRIVATE_KEY!;
  if (!key) throw new Error("Private key is undefined!");

  const signer = new TypedEthereumSigner(key);
  res.status(200).json({ publicKey: signer.publicKey.toString("hex") });
});

app.post("/bundlr/signData", async (req: Request, res: Response) => {
  if (!allowedDomains.includes(req.headers.host ?? "")) {
    res.status(403).json({ error: "Access Forbidden" });
  }

  const { messageData } = req.body;

  if (!messageData) {
    res.status(400).json({ error: "messageData is undefined" });
    return;
  }

  if (!isHexString(messageData)) {
    res.status(400).json({ error: "messageData is not a hex string" });
    return;
  }

  const messageDataBuffer = Buffer.from(messageData, "hex");

  const key = process.env.BUNDLR_PAYMENT_PRIVATE_KEY;
  if (!key) throw new Error("Private key is undefined!");

  const signer = new TypedEthereumSigner(key);
  const signature = Buffer.from(await signer.sign(messageDataBuffer));

  res.status(200).json({ signature: signature.toString("hex") });
});

app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
