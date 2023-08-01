import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOnlineNodes, getUptimeStats } from "./utils/db";

import { TypedEthereumSigner } from "arbundles";

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

app.get("/arch-uptime-statistics", (req: Request, res: Response) => {
  getUptimeStats()
    .then(stats => res.send(stats))
    .catch(() => res.status(500));
});

app.get("/bundlr/publicKey", async (req: Request, res: Response) => {
  const key = process.env.BUNDLR_PAYMENT_PRIVATE_KEY!;
  if (!key) throw new Error("Private key is undefined!");

  const signer = new TypedEthereumSigner(key);
  res.status(200).json({ publicKey: signer.publicKey.toString("hex") });
});

app.post("/bundlr/signData", async (req: Request, res: Response) => {
  const messageDataBuffer = Buffer.from(req.body.messageData, "hex");

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
