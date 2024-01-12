import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOfflineNodesAddresses, getOnlineNodes, getUptimeStats } from "./utils/db";
import { SubgraphData } from "./graph/subgraph";

import { TypedEthereumSigner } from "arbundles";
import { NodeSarcoClient } from "@sarcophagus-org/sarcophagus-v2-sdk";
import { BigNumber, ethers } from "ethers";

const app = express();
const port = 4000;

const whitelistedDomains = [
  "https://app.dev.sarcophagus.io",
  "https://app.sarcophagus.io"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (origin && whitelistedDomains.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

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

app.get("/offline-archaeologists", (req: Request, res: Response) => {
  getOfflineNodesAddresses()
    .then(offlineList => res.send(offlineList))
    .catch(() => res.status(500));
});

app.get("/subgraph/arch-stats", (req: Request, res: Response) => {
  SubgraphData.getArchStats(req.query.archAddress as string, req.query.chainId as string)
    .then(stats => res.send(stats))
    .catch(() => res.status(500));
});

app.get("/subgraph/sarcophagus", (req: Request, res: Response) => {
  SubgraphData.getSarcophagus(req.query.sarcoId as string, req.query.archAddress as string, req.query.chainId as string)
    .then(sarco => res.send(sarco))
    .catch(() => res.status(500));
});

app.get("/subgraph/sarcophagi-ids", (req: Request, res: Response) => {
  SubgraphData.getSarcophagiIds(req.query.archAddress as string, req.query.chainId as string)
    .then(sarcoIds => res.send(sarcoIds))
    .catch(() => res.status(500));
});

app.get("/subgraph/sarcophagi", (req: Request, res: Response) => {
  SubgraphData.getSarcophagi(req.query.archAddress as string, req.query.chainId as string)
    .then(sarcos => res.send(sarcos))
    .catch(() => res.status(500));
});

app.get("/subgraph/active-sarcophagi", (req: Request, res: Response) => {
  SubgraphData.getActiveSarcophagi(req.query.archAddress as string, req.query.chainId as string)
    .then(sarcos => res.send(sarcos))
    .catch(() => res.status(500));
});

app.get("/subgraph/past-sarcophagi", (req: Request, res: Response) => {
  SubgraphData.getPastSarcophagi(req.query.archAddress as string, req.query.chainId as string)
    .then(sarcos => res.send(sarcos))
    .catch(() => res.status(500));
});

app.get("/bundlr/publicKey", async (req: Request, res: Response) => {
  const key = process.env.BUNDLR_PAYMENT_PRIVATE_KEY!;
  if (!key) throw new Error("Private key is undefined!");

  const signer = new TypedEthereumSigner(key);
  res.status(200).json({ publicKey: signer.publicKey.toString("hex") });
});

app.get("/quote", async (req: Request, res: Response) => {
  try {
    const sdk = new NodeSarcoClient({
      chainId: Number(req.query.chainId),
      privateKey: ethers.Wallet.createRandom().privateKey, // private key doesn't matter for these purposes
      providerUrl: "https://eth-mainnet.g.alchemy.com/v2/demo", // neither does provider
      zeroExApiKey: process.env.ZERO_X_API_KEY,
    });

    const quote = sdk.utils.getSarcoQuote(BigNumber.from(req.query.amount));

    res.status(200).json(quote);
  } catch (error) {
    res.status(500).json(error);
  }
});

app.post("/bundlr/signData", async (req: Request, res: Response) => {
  const { messageData } = req.body;

  if (!messageData) {
    res.status(400).json({ error: "messageData is undefined" });
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
