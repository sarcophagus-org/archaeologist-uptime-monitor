import { BigNumber } from "ethers";

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
