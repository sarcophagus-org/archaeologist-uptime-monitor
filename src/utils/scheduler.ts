import scheduler from "node-schedule";
import { dialArchaeologists } from "./dial-archaeologists";
import { logging } from "./logger";

export async function scheduleDial(date: Date) {
  logging.notice(`Scheduling dial at: ${date.toString()}`);

  scheduler.scheduleJob(date, async () => {
    const nextDial = await dialArchaeologists();
    scheduleDial(nextDial);
  });
}
