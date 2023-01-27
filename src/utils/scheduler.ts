import scheduler from "node-schedule";
import { dialArchaeologists } from "./dial-archaeologists";
import { logging } from "./logger";

let isAlreadyScheduled = false;

export async function scheduleDial(date: Date) {
  if (isAlreadyScheduled) {
    logging.warn("Attempting to schedule multiple dial jobs -- exiting");
    return;
  }

  isAlreadyScheduled = true;
  logging.notice(`Scheduling dial at: ${date.toString()}`);

  scheduler.scheduleJob(date, async () => {
    const nextDial = await dialArchaeologists();
    isAlreadyScheduled = false;
    scheduleDial(nextDial);
  });
}
