import "dotenv/config";
import { NodeConfig } from "./utils/node-config";
import { createAndStartNode } from "./p2p-node";
import { genListenAddresses, SIGNAL_SERVER_LIST } from "./utils/p2p-addresses";
import { logging } from "./utils/logger";
import { Libp2p } from "@libp2p/interface-libp2p";
import process from "process";

export let p2pNode: Libp2p;

export async function startService() {
  const nodeConfig = new NodeConfig({ isBootstrap: true });
  nodeConfig.add("addresses", { listen: genListenAddresses(SIGNAL_SERVER_LIST) })

  p2pNode = await createAndStartNode(nodeConfig.configObj);
}

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(eventType => {
  process.on(eventType, async (e) => {
    logging.info(`Received exit event: ${eventType}`);
    !!e && console.error(e);
    process.exit(2);
  });
});