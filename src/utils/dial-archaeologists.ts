import { ArchaeologistProfile } from "lib/types/arch-profile";
import { getWeb3Interface } from "./web3-interface";
import { Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { logging } from "./logger";
import { p2pNode } from "../start-service";

interface Archaeologist {
  profile: any;
  connectionStatus: boolean;
}

interface ProfileWithMultiaddr {
  profile: any;
  multiAddr: Multiaddr;
}

export let inMemoryOnlineNodes: ProfileWithMultiaddr[] = [];
export let inMemoryOfflineNodeAddresses: string[] = [];

export async function dialArchaeologists(): Promise<Date> {
  const onlineNodes: ProfileWithMultiaddr[] = [];
  const offlineNodeAddresses: string[] = [];
  const web3Interface = await getWeb3Interface();

  // Retrieve all registered archaeologists on-chain
  const addresses: string[] = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
  let profiles: ArchaeologistProfile[] = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);
  const archaeologistsToDial = profiles.map((p, i) => ({
    profile: {
      ...p,
        archAddress: addresses[i]
    }
  }));

  // Setup archaeologist structure
  const wssProfiles = archaeologistsToDial.filter(arch => arch.profile.peerId.split(":").length === 2);
  const archaeologists: Archaeologist[] = wssProfiles.map(arch => ({ profile: arch.profile, connectionStatus: false }));

  // Track failed nodes for reporting
  let failedNodes: Map<string, { arch: Archaeologist; address: Multiaddr }> = new Map();

  logging.error("---DIALING ARCHAEOLOGISTS---");

  const tryDial = async (arch: Archaeologist, address: Multiaddr): Promise<void> => {
    try {
      await p2pNode.dial(address);

      arch.connectionStatus = true;
      onlineNodes.push({
        multiAddr: address,
        profile: arch.profile,
      });

      setTimeout(async () => {
        await p2pNode.hangUp(address);
      }, 200)
    } catch (e) {
      failedNodes.set(arch.profile.archAddress, { address, arch }) ;
    }
  };

  for (let arch of archaeologists) {
    const peerIdParts = arch.profile.peerId.split(":");
    const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);

    await tryDial(arch, addr);
  }

  // Update in memory nodes to serve to clients
  inMemoryOnlineNodes = onlineNodes;
  inMemoryOfflineNodeAddresses = Array.from(failedNodes.keys());

  logging.notice(`Total Registered Archaeologists: ${archaeologists.length}`)
  logging.notice(`Successes: ${onlineNodes.length}`);
  logging.notice(`Fails: ${failedNodes.size}`);
  logging.error("---FINISHED DIALING ARCHAEOLOGISTS---");

  logging.notice(`failed archaeologists: ${JSON.stringify(inMemoryOfflineNodeAddresses)}`)

  return new Date(Date.now() + Number.parseInt(process.env.DIAL_INTERVAL_MS!));
}
