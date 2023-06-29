import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { getOnlineNodes, getUptimeStats } from "./utils/db";
import { SubgraphData } from "utils/subgraph";

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

app.get("/arch-uptime-statistics", (req: Request, res: Response) => {
  getUptimeStats()
    .then(stats => res.send(stats))
    .catch(() => res.status(500));
});

// SUBGRAPH API
app.get("/subgraph/arch-stats", (req: Request, res: Response) => {
  const archAddress = req.query.archAddress as string;
  SubgraphData.getArchStats(archAddress)
    .then(stats => res.send(stats))
    .catch(() => res.status(500));
});

app.get("/subgraph/sarcophagus", (req: Request, res: Response) => {
  const sarcoId = req.query.sarcoId as string;
  const archAddress = req.query.archAddress as string;

  SubgraphData.getSarcophagus(sarcoId, archAddress)
    .then(sarco => res.send(sarco))
    .catch(() => res.status(500));
});

const getActiveSarcophagi = (archAddress: string) => SubgraphData.getActiveSarcophagi(archAddress);
const getPastSarcophagi = (archAddress: string) => SubgraphData.getPastSarcophagi(archAddress);
 
app.get("/subgraph/sarcophagi", (req: Request, res: Response) => {
  const archAddress = req.query.archAddress as string;

  getActiveSarcophagi(archAddress)
    .then(async activeSarco => {
      const pastSarco = await getPastSarcophagi(archAddress);
      res.send([...activeSarco, ...pastSarco]);
    })
    .catch(() => res.status(500));
});

app.get("/subgraph/active-sarcophagi", (req: Request, res: Response) => {
  const archAddress = req.query.archAddress as string;

  getActiveSarcophagi(archAddress)
    .then(async activeSarco => res.send(activeSarco))
    .catch(() => res.status(500));
});

app.get("/subgraph/past-sarcophagi", (req: Request, res: Response) => {
  const archAddress = req.query.archAddress as string;

  getPastSarcophagi(archAddress)
    .then(async pastSarco => res.send(pastSarco))
    .catch(() => res.status(500));
});


app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
