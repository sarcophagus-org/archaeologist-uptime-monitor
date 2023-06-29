import { BigNumber } from "ethers";
import { logging } from "./logger";
import { getWeb3Interface } from "./web3-interface";


export const getBlockTimestamp = async (): Promise<number> => {
  try {
    const web3Interface = await getWeb3Interface();
    const provider = web3Interface.ethWallet.provider;
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    return block.timestamp;
  } catch (error) {
    // Not a good fallback, may want to institute a retry or failure (or notification)
    logging.warn(`Error retrieving block time: ${error}`);
    return Date.now();
  }
};

export async function getGracePeriod(): Promise<BigNumber> {
  const web3Interface = await getWeb3Interface();
  return web3Interface.viewStateFacet.getGracePeriod();
}

export const getDateFromTimestamp = (timestamp: number) => new Date(timestamp * 1000);
