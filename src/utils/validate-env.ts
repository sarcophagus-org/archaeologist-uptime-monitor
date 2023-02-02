import "dotenv/config";
import { BAD_ENV } from "./exit-codes";
import { exit } from "process";
import { getNetworkConfigByChainId, isLocalNetwork } from "../lib/config";
import { hardhatNetworkConfig } from "../lib/config/hardhat";
import { logging } from "./logger";
import { MIN_DIAL_INTERVAL_MS } from "../consts";

const _tryReadEnv = (
  envName: string,
  envVar: string | undefined,
  config?: {
    required?: boolean;
    callback?: (envVar: string) => any;
  }
) => {
  const isRequired = config && config.required;
  if (isRequired && !envVar) {
    logging.error(`${envName} is required and not set in .env`);
    exit(BAD_ENV);
  } else if (!envVar) {
    return;
  }

  if (!config || !config.callback) return;

  try {
    config.callback(envVar);
  } catch (e) {
    logging.debug(e);
    logging.error(`${envName} is invalid: ${envVar}`);
    exit(BAD_ENV);
  }
};

export function validateEnvVars() {
  const chainID = isLocalNetwork ? hardhatNetworkConfig.chainId.toString() : process.env.CHAIN_ID;
  _tryReadEnv("CHAIN_ID", chainID, {
    required: true,
    callback: envVar => {
      getNetworkConfigByChainId(envVar);
    },
  });

  const providerURL = isLocalNetwork ? hardhatNetworkConfig.providerUrl : process.env.PROVIDER_URL;
  _tryReadEnv("PROVIDER_URL", providerURL, { required: true });

  _tryReadEnv("DIAL_INTERVAL_MS", process.env.DIAL_INTERVAL_MS, {
    required: true,
    callback: envVar => {
      const val = Number.parseInt(envVar);
      if (val < MIN_DIAL_INTERVAL_MS) {
        throw new Error("Dial interval too short");
      }
    },
  });

  _tryReadEnv("FIREBASE_API_KEY", process.env.FIREBASE_API_KEY, { required: true });
  _tryReadEnv("FIREBASE_PROJECT_ID", process.env.FIREBASE_PROJECT_ID, { required: true });
}
