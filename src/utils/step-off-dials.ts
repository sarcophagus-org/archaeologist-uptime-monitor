import jsonfile from "jsonfile";
import { logging } from "./logger";

const file = "./failed-dials.json";

export interface FailedDial {
  peerId: string;
  timestampOfDial: number;
  nDialsToSkip: number;
  nFails: number;
}

export function updateFailedDials(failedDials: FailedDial[]) {
  jsonfile.writeFile(file, failedDials, err => {
    if (err) console.error(err);
  });
}

export async function getPreviouslyFailedDials() {
  let previouslyFialedDials: FailedDial[] = [];
  try {
    previouslyFialedDials = await jsonfile.readFile(file);
  } catch (e) {
    logging.debug(`Could not read failed-dials.json: ${e}`);
  }

  return previouslyFialedDials;
}
