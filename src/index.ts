import express, { Request, Response } from "express";
import cors from "cors";
import { validateEnvVars } from "./utils/validate-env";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { onlineNodes } from "./utils/dial-archaeologists";

const app = express();
const port = 4000;

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Monitor online");
});

app.get("/online-archaeologists", (req: Request, res: Response) => {
  res.send(onlineNodes.map(node => node.profile.peerId));
});

app.listen(port, async () => {
  logging.debug("App start");
  validateEnvVars();
  await startService();
});
