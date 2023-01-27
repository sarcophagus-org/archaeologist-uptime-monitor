import "dotenv/config";
import { NodeConfig } from "./utils/node-config";
import { createAndStartNode } from "./p2p-node";
import { logging } from "./utils/logger";
import { Libp2p } from "@libp2p/interface-libp2p";
import process from "process";
import { UNCAUGHT_EXCEPTION } from "./utils/exit-codes";

export let p2pNode: Libp2p;

export async function startService() {
  const nodeConfig = new NodeConfig({ isBootstrap: true });

  p2pNode = await createAndStartNode(nodeConfig.configObj);
}

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(eventType => {
  process.on(eventType, async e => {
    logging.info(`Received exit event: ${eventType}`);
    !!e && console.error(e);
    process.exit(UNCAUGHT_EXCEPTION);
  });
});
