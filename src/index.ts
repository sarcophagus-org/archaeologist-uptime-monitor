import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { inMemoryOnlineNodes, inMemoryOfflineNodeAddresses } from "./utils/dial-archaeologists";
import { incentivizedArchaeologists } from "./data/seeds"

const app = express();
const port = 4000;

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Monitor online");
});

app.get("/online-archaeologists", (req: Request, res: Response) => {
  res.send(inMemoryOnlineNodes.map(node => node.profile.peerId));
});

app.get("/offline-archaeologists", (req: Request, res: Response) => {
  const incentivizedOfflineNodes = incentivizedArchaeologists.filter(value => inMemoryOfflineNodeAddresses.includes(value));
  res.send(incentivizedOfflineNodes);
});

app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
