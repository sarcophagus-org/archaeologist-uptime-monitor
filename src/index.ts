import express, { Request, Response } from "express";
import { startService } from "./start-service";
import { logging } from "./utils/logger";
import { scheduleDial } from "./utils/scheduler";

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
  try {
    await startService();

    scheduleDial(new Date(Date.now() + 2000));

    // TODO: WRITE DATA TO DB
  } catch (e) {
    logging.debug(e);
    // console.log(e);
  }
});
