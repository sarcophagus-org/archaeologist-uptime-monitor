import { ArchaeologistProfile } from "lib/types/arch-profile";
import { getWeb3Interface } from "./web3-interface";
import { Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { logging } from "./logger";
import { p2pNode } from "../start-service";
import { saveDialResults } from "./db";

interface Archaeologist {
  profile: any;
  connectionStatus: boolean;
}

interface ArchIdentifier {
  peerId: string;
  address: string;
}

export async function dialArchaeologists(): Promise<Date> {
  const onlineNodes: ArchIdentifier[] = [];
  const offlineNodes: ArchIdentifier[] = [];
  const web3Interface = await getWeb3Interface();

  // Retrieve all registered archaeologists on-chain
  const addresses: string[] = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
  let profiles: ArchaeologistProfile[] = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);
  const archaeologistsToDial = profiles.map((p, i) => ({
    profile: {
      ...p,
      archAddress: addresses[i],
    },
  }));

  // Setup archaeologist structure
  const wssProfiles = archaeologistsToDial.filter(arch => arch.profile.peerId.split(":").length === 2);
  const archaeologists: Archaeologist[] = wssProfiles.map(arch => ({ profile: arch.profile, connectionStatus: false }));

  logging.error("---DIALING ARCHAEOLOGISTS---");
  const timestampOfDial = Date.now();
  const progressIndicator = setInterval(() => process.stdout.write("."), 5000);

  const tryDial = async (arch: Archaeologist, address: Multiaddr): Promise<void> => {
    try {
      await p2pNode.dial(address);

      arch.connectionStatus = true;
      onlineNodes.push({
        peerId: arch.profile.peerId,
        address: arch.profile.archAddress,
      });

      setTimeout(async () => {
        await p2pNode.hangUp(address);
      }, 200);
    } catch (e) {
      offlineNodes.push({
        peerId: arch.profile.peerId,
        address: arch.profile.archAddress,
      });
    }
  };

  for (let arch of archaeologists) {
    const peerIdParts = arch.profile.peerId.split(":");
    const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);

    await tryDial(arch, addr);
  }

  logging.notice(`\nTotal Registered Archaeologists: ${archaeologists.length}`);
  logging.notice(`Successes: ${onlineNodes.length}`);
  logging.notice(`Fails: ${offlineNodes.length}`);
  logging.error("---FINISHED DIALING ARCHAEOLOGISTS---");

  clearInterval(progressIndicator);

  // persist to db
  const getDialAttempt = (node: ArchIdentifier, connectionStatus: boolean) => ({
    address: node.address,
    peerId: node.peerId,
    timestampOfDial,
    connectionStatus,
  });

  saveDialResults(
    [...onlineNodes.map(node => getDialAttempt(node, true)), ...offlineNodes.map(node => getDialAttempt(node, false))],
    timestampOfDial,
    onlineNodes.length,
    offlineNodes.length
  );

  return new Date(Date.now() + Number.parseInt(process.env.DIAL_INTERVAL_MS!));
}
