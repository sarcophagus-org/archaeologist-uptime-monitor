import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOfflineNodesAddresses, getOnlineNodes, getUptimeStats } from "./utils/db";
import { SubgraphData } from "./graph/subgraph";
import axios from "axios";
import { getChain } from "@alchemy/aa-core";

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
  res.set('Cache-Control', 'no-cache');

  if (!req.query.chainId) {
    res.status(500).json({'error': 'chain ID required'});
  }

  if (!req.query.amount) {
    res.status(500).json({'amount': 'amount required'});
  }

  try {
    const sdk = new NodeSarcoClient({
      chainId: Number(req.query.chainId),
      privateKey: ethers.Wallet.createRandom().privateKey, // private key doesn't matter for these purposes
      providerUrl: "https://eth-mainnet.g.alchemy.com/v2/demo", // neither does provider
      zeroExApiKey: process.env.ZERO_X_API_KEY,
    });

    const quote = await sdk.utils.getSarcoQuote(BigNumber.from(req.query.amount));

    console.log('0x quote:', quote);
    res.status(200).json(quote);
  } catch (error) {
    console.log('error retrieving quote:', error);
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

app.post("/api/rpc/*", async (req: Request, res: Response) => {
  const apiUrl = "https://api.g.alchemy.com";
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (apiKey == null) {
    return res.status(500).json({ error: "ALCHEMY_API_KEY is not set" });
  }

  const body = req.body;
  const routes = req.params[0]?.split('/') || [];

  try {
    const response = await axios({
      method: "POST",
      url: `${apiUrl}/${routes.join("/")}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: body,
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error forwarding request to Alchemy:', error.response?.data || error.message);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        res.status(error.response.status).json(error.response.data);
      } else {
        // Something happened in setting up the request that triggered an Error
        res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.post("/api/rpc/chain/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const chain = getChain(parseInt(id));

  if (!chain) {
    return res.status(404).json({ error: `Chain not found: ${id}` });
  }

  const rpcUrl = chain.rpcUrls.alchemy.http[0];
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ALCHEMY_API_KEY is not set" });
  }

  const body = req.body;

  try {
    const apiResponse = await axios({
      method: "POST",
      url: `${rpcUrl}/${apiKey}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
    });

    res.json(apiResponse.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error forwarding request to Alchemy:', error.response?.data || error.message);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        res.status(error.response.status).json(error.response.data);
      } else {
        // Something happened in setting up the request that triggered an Error
        res.status(500).json({ error: 'Server error occurred' });
      }
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Server error occurred' });
    }
  }
});

app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
