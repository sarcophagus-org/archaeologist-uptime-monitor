import { ethers } from "ethers";
import { exit } from "process";
import {
  IERC20,
  ViewStateFacet__factory,
  ArchaeologistFacet,
  EmbalmerFacet,
  ViewStateFacet,
  ThirdPartyFacet,
  ThirdPartyFacet__factory,
} from "@sarcophagus-org/sarcophagus-v2-contracts";
import { getNetworkConfigByChainId, localChainId } from "../lib/config";
import { NetworkConfig } from "../lib/types/network-config";
import { logging } from "./logger";
import { BAD_ENV } from "./exit-codes";

export interface Web3Interface {
  networkName: string;
  ethWallet: ethers.Wallet;
  encryptionHdWallet: ethers.utils.HDNode;
  sarcoToken: IERC20;
  archaeologistFacet: ArchaeologistFacet;
  embalmerFacet: EmbalmerFacet;
  thirdPartyFacet: ThirdPartyFacet;
  viewStateFacet: ViewStateFacet;
  networkConfig: NetworkConfig;
}

let web3Interface: Web3Interface;

export const getWeb3Interface = async (): Promise<Web3Interface> => {
  try {
    if (!!web3Interface) return web3Interface;

    const networkConfig = getNetworkConfigByChainId(process.env.CHAIN_ID || localChainId);

    const rpcProvider = new ethers.providers.JsonRpcProvider(networkConfig.providerUrl || process.env.PROVIDER_URL);

    const network = await rpcProvider.detectNetwork();

    const viewStateFacet: ViewStateFacet = ViewStateFacet__factory.connect(
      networkConfig.diamondDeployAddress,
      rpcProvider
    );
    const thirdPartyFacet = ThirdPartyFacet__factory.connect(networkConfig.diamondDeployAddress, rpcProvider);

    // Cannot confirm rpcProvider is valid until an actual network call is attempted
    await viewStateFacet.getTotalProtocolFees();

    web3Interface = {
      networkName: network.name,
      viewStateFacet,
      thirdPartyFacet,
      networkConfig,
    } as Web3Interface;
    return web3Interface;
  } catch (e) {
    logging.error(e);
    logging.error("Confirm PROVIDER_URL in .env is a valid RPC Provider URL");
    exit(BAD_ENV);
  }
};
