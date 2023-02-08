import { ArchaeologistProfile } from "lib/types/arch-profile";
import { getWeb3Interface } from "./web3-interface";
import { Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { logging } from "./logger";
import { p2pNode } from "../start-service";
import { saveDialResults } from "./db";
import { getPreviouslyFailedDials, updateFailedDials } from "./step-off-dials";

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

  let previouslyFialedDials = await getPreviouslyFailedDials();
  logging.debug(`Skipping ${previouslyFialedDials.filter(p => !!p.nDialsToSkip).length} archaeologists`);

  const tryDial = async (arch: Archaeologist, address: Multiaddr): Promise<boolean> => {
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

      return true;
    } catch (e) {
      offlineNodes.push({
        peerId: arch.profile.peerId,
        address: arch.profile.archAddress,
      });

      return false;
    }
  };

  for (let arch of archaeologists) {
    const previouslyFailedIndex = previouslyFialedDials.findIndex(p => p.peerId === arch.profile.peerId);
    const hasPreviouslyFailed = previouslyFailedIndex !== -1;

    if (hasPreviouslyFailed) {
      const failedData = previouslyFialedDials[previouslyFailedIndex];
      if (failedData.nDialsToSkip > 0) {
        failedData.nDialsToSkip--;
        continue;
      }
    }

    const peerIdParts = arch.profile.peerId.split(":");
    const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);

    if (await tryDial(arch, addr)) {
      if (hasPreviouslyFailed) {
        // Because this previously failing node was successfully connected to on this attempt,
        // do not skip next attempt
        logging.debug(`Managed to reach ${arch.profile.peerId} this time`);
        previouslyFialedDials[previouslyFailedIndex].nFails = 0;
      }
    } else {
      if (hasPreviouslyFailed) {
        // Because this previously failing node still fails,
        // add an extra skip dial for future dials
        const nFails = previouslyFialedDials[previouslyFailedIndex].nFails;
        previouslyFialedDials[previouslyFailedIndex].nFails = nFails + 1;
        previouslyFialedDials[previouslyFailedIndex].nDialsToSkip = nFails + 1;
      } else {
        // This is a newly failing node
        previouslyFialedDials.push({
          nDialsToSkip: 0,
          nFails: 1,
          peerId: arch.profile.peerId,
          timestampOfDial,
        });
      }
    }
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

  updateFailedDials(previouslyFialedDials.filter(p => !!p.nFails));

  return new Date(Date.now() + Number.parseInt(process.env.DIAL_INTERVAL_MS!));
}
