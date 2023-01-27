import express, { Request, Response } from "express";
import { startService } from "./start-service";
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
  await startService();
});
