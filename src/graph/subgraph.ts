import { getWeb3Interface } from "../utils/web3-interface";
import fetch from "node-fetch";
import "dotenv/config";
import { BigNumber } from "ethers";
import process from "process";

export interface SarcophagusDataSimple {
  id: string;
  curseStatus: string;
  creationDate: Date;
  resurrectionTime: Date;
}
interface SarcoDataSubgraph {
  sarcoId: string;
  publishes: string[];
  resurrectionTime: string;
  blockTimestamp: string;
}

export const getBlockTimestamp = async (): Promise<number> => {
  try {
    const web3Interface = await getWeb3Interface();
    const provider = web3Interface.ethWallet.provider;
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    return block.timestamp;
  } catch (error) {
    // Not a good fallback, may want to institute a retry or failure (or notification)
    return Math.trunc(Date.now() / 1000);
  }
};

export const getDateFromTimestamp = (timestamp: number) => new Date(timestamp * 1000);
export async function getGracePeriod(): Promise<BigNumber> {
  const web3Interface = await getWeb3Interface();
  return web3Interface.viewStateFacet.getGracePeriod();
}

const getSubgraphUrl = (chainId: string): string => {
  return (chainId === "5") ? process.env.GOERLI_SUBGRAPH_URL! : process.env.MAINNET_SUBGRAPH_URL!
}
async function queryGraphQl(query: string, chainId: string) {
  const response = await fetch(
    getSubgraphUrl(chainId),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }
  );

  const { data } = (await response.json()) as { data: any };
  return data;
}

const getArchStatsQuery = (archAddress: string) => `query {
    archaeologist (id: "${archAddress}") {
        address
        successes
        failures
        accusals
        blockTimestamp
    }
}`;

const getArchSarcosQuery = (
  archAddress: string,
  opts?: { activeTimeThreshold: number; limitToActiveForArch: boolean }
) => {
  return `query {
    sarcophagusDatas (
        where: {
            cursedArchaeologists_contains_nocase: ["${archAddress}"],
            ${
    !opts
      ? ""
      : opts.limitToActiveForArch
        ? // ACTIVE: arch has NOT published, AND sarco is not expired or buried
        `publishes_not_contains_nocase: ["${archAddress}"], resurrectionTime_gt: ${opts.activeTimeThreshold}, isBuried: false`
        : // INACTIVE: res time is behind resurrection threshold (sarco has expired)
        `resurrectionTime_lte: ${opts.activeTimeThreshold}`
  }
        }
        orderBy: resurrectionTime,
        orderDirection: desc
    ) {
        sarcoId
        resurrectionTime
        previousRewrapTime
        publishes
        blockTimestamp
    }
  }`;
};

const getSarcoWithRewrapsQuery = (sarcoId: string) => {
  return `query {
    sarcophagusData (id: "${sarcoId}") {
        sarcoId
        resurrectionTime
        previousRewrapTime
        publishes
        blockTimestamp
    },
    rewrapSarcophaguses (where:{sarcoId: "${sarcoId}"}) {
      id
      blockNumber
      totalDiggingFees
    }
  }`;
};

const getCurseStatus = (
  sarcophagusData: SarcoDataSubgraph,
  archAddress: string,
  blockTimestamp: number,
  resurrectionThreshold: number
): string =>
  sarcophagusData.publishes.includes(archAddress.toLowerCase())
    ? "SUCCESS"
    : blockTimestamp < resurrectionThreshold
      ? "ACTIVE"
      : "FAILED";

export class SubgraphData {
  static getArchStats = async (archAddress: string, chainId: string) => {
    const { archaeologist: archStats } = await queryGraphQl(getArchStatsQuery(archAddress), chainId);

    const { successes, accusals, failures } = archStats;

    return {
      successes: successes.length,
      accusals,
      fails: failures,
    };
  };

  static getSarcophagus = async (
    sarcoId: string,
    archAddress: string,
    chainId: string
  ): Promise<
    | (SarcophagusDataSimple & {
    rewrapCount: number;
  })
    | undefined
  > => {
    try {
      const { sarcophagusData, rewrapSarcophaguses } = (await queryGraphQl(
        getSarcoWithRewrapsQuery(sarcoId),
        chainId
      )) as {
        sarcophagusData: SarcoDataSubgraph;
        rewrapSarcophaguses: {
          blockNumber: string;
          totalDiggingFees: string;
        }[];
      };

      const blockTimestamp = await getBlockTimestamp();
      const resurrectionThreshold =
        Number.parseInt(sarcophagusData.resurrectionTime) + (await getGracePeriod()).toNumber();

      return {
        id: sarcophagusData.sarcoId,
        curseStatus: getCurseStatus(
          sarcophagusData,
          archAddress,
          blockTimestamp,
          resurrectionThreshold
        ),
        creationDate: getDateFromTimestamp(Number.parseInt(sarcophagusData.blockTimestamp)),
        resurrectionTime: getDateFromTimestamp(Number.parseInt(sarcophagusData.resurrectionTime)),
        rewrapCount: rewrapSarcophaguses.length,
      };
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Returns all sarcophagi ids that the archaeologist is cursed on, sourced
   * from subgraph.
   */
  static getSarcophagiIds = async (archAddress: string, chainId: string): Promise<string[]> => {
    try {
      const { sarcophagusDatas } = (await queryGraphQl(getArchSarcosQuery(archAddress), chainId)) as {
        sarcophagusDatas: SarcoDataSubgraph[];
      };

      return sarcophagusDatas.map(s => s.sarcoId);
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  /**
   * Returns all sarcophagi that the archaeologist is cursed on, sourced
   * from subgraph. This DOES NOT include `cursedAmount` and `perSecondFee`
   * and must be queried separately from the contracts.
   */
  static getSarcophagi = async (archAddress: string, chainId: string): Promise<SarcophagusDataSimple[]> => {
    try {
      const { sarcophagusDatas } = (await queryGraphQl(getArchSarcosQuery(archAddress), chainId)) as {
        sarcophagusDatas: SarcoDataSubgraph[];
      };

      const blockTimestamp = await getBlockTimestamp();
      const gracePeriod = (await getGracePeriod()).toNumber();

      return sarcophagusDatas.map(s => ({
        id: s.sarcoId,
        curseStatus: getCurseStatus(
          s,
          archAddress,
          blockTimestamp,
          Number.parseInt(s.resurrectionTime) + gracePeriod
        ),
        creationDate: getDateFromTimestamp(Number.parseInt(s.blockTimestamp)),
        resurrectionTime: getDateFromTimestamp(Number.parseInt(s.resurrectionTime)),
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  static getActiveSarcophagi = async (archAddress: string, chainId: string): Promise<SarcophagusDataSimple[]> => {
    try {
      const blockTimestamp = await getBlockTimestamp();
      const gracePeriod = (await getGracePeriod()).toNumber();

      const { sarcophagusDatas } = (await queryGraphQl(
        getArchSarcosQuery(archAddress, {
          limitToActiveForArch: true,
          activeTimeThreshold: blockTimestamp - gracePeriod,
        }), chainId
      )) as { sarcophagusDatas: SarcoDataSubgraph[] };

      return sarcophagusDatas.map<SarcophagusDataSimple>(s => ({
        id: s.sarcoId,
        curseStatus: "ACTIVE",
        creationDate: getDateFromTimestamp(Number.parseInt(s.blockTimestamp)),
        resurrectionTime: getDateFromTimestamp(Number.parseInt(s.resurrectionTime)),
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  static getPastSarcophagi = async (archAddress: string, chainId: string): Promise<SarcophagusDataSimple[]> => {
    try {
      const blockTimestamp = await getBlockTimestamp();
      const gracePeriod = (await getGracePeriod()).toNumber();

      const { sarcophagusDatas } = (await queryGraphQl(
        getArchSarcosQuery(archAddress, {
          limitToActiveForArch: false,
          activeTimeThreshold: blockTimestamp - gracePeriod,
        }), chainId
      )) as { sarcophagusDatas: SarcoDataSubgraph[] };

      return sarcophagusDatas.map<SarcophagusDataSimple>(s => ({
        id: s.sarcoId,
        curseStatus: getCurseStatus(
          s,
          archAddress,
          blockTimestamp,
          Number.parseInt(s.resurrectionTime) + gracePeriod
        ),
        creationDate: getDateFromTimestamp(Number.parseInt(s.blockTimestamp)),
        resurrectionTime: getDateFromTimestamp(Number.parseInt(s.resurrectionTime)),
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  };
}
