import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOfflineNodesAddresses, getOnlineNodes, getUptimeStats } from "./utils/db";
import { SubgraphData } from "./graph/subgraph";

const app = express();
const port = 4000;

app.use(cors());

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

app.get("/arch-uptime-statistics", (req: Request, res: Response) => {
  getUptimeStats()
    .then(stats => res.send(stats))
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

app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
