import { createAndStartNode } from "./p2p_node";
import { genListenAddresses, SIGNAL_SERVER_LIST } from "./utils/p2p_addresses";

export function startService() {
  createAndStartNode({
    addresses: {
      listen: genListenAddresses(SIGNAL_SERVER_LIST),
    },
  });
}
