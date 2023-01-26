import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { startService } from "./start_service";
import { logging } from "./utils/logger";

dotenv.config();

const app = express();
const port = 4000;

app.get("/", (req: Request, res: Response) => {
  res.send("Monitor online");
});

app.get("/online-archaeologists", (req: Request, res: Response) => {
  res.send([{ id: "peerId" }]);
});

app.listen(port, () => {
  logging.debug("App start");
  startService();
});
