import { BigNumber } from "ethers";

// TODO -- the profiles dont include the reputation stats
// These need to be fetched separately
export interface ArchaeologistProfile {
  accusals: BigNumber;
  archAddress: string;
  cleanups: BigNumber;
  exists: boolean;
  failures: BigNumber;
  freeBond: BigNumber;
  maximumRewrapInterval: BigNumber;
  minimumDiggingFee: BigNumber;
  peerId: string;
  successes: BigNumber;
}
