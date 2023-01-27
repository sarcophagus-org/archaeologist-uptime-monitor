import { createLibp2p, Libp2p, Libp2pOptions } from "libp2p";
import { logging } from "./utils/logger";

/**
 * Setup and return a libp2p node instance
 * @param configOptions - Libp2p config
 */
export async function createAndStartNode(configOptions: Libp2pOptions): Promise<Libp2p> {
  const node = await createLibp2p(configOptions);

  const peerId = node.peerId.toString();
  await node.start();

  logging.notice(`\n⚡️ Archaeologist uptime monitor started with id: ${peerId.slice(peerId.length - 5)}\n`);

  return node;
}
