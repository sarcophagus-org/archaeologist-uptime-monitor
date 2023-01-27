import { ArchaeologistProfile } from "lib/types/arch-profile";
import { getWeb3Interface } from "./web3-interface";
import { Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { logging } from "./logger";
import { p2pNode } from "../start-service";

interface ArchWithIsOnline {
  profile: any;
  connectionStatus: boolean;
}

interface ProfileWithMultiaddr {
  profile: any;
  multiAddr: Multiaddr;
}

export let onlineNodes: ProfileWithMultiaddr[] = [];

export async function dialArchaeologists(): Promise<Date> {
  onlineNodes = [];
  const web3Interface = await getWeb3Interface();

  const addresses: string[] = await web3Interface.viewStateFacet.getArchaeologistProfileAddresses();
  const profiles: ArchaeologistProfile[] = await web3Interface.viewStateFacet.getArchaeologistProfiles(addresses);
  const wssProfiles = profiles.filter(profile => profile.peerId.split(":").length === 2);

  let dials = 0;
  let fails = 0;
  let failedNodes: Record<string, { arch: ArchWithIsOnline; addr: Multiaddr } | undefined> = {};

  const archaeologists: ArchWithIsOnline[] = wssProfiles.map(p => ({ profile: p, connectionStatus: false }));

  logging.error("---DIALING ARCHAEOLOGISTS---");

  const tryDial = async (arch: ArchWithIsOnline, addr) => {
    try {
      const res = await p2pNode.dial(addr);
      if (res) {
        dials++;
        arch.connectionStatus = true;
        onlineNodes.push({
          multiAddr: addr,
          profile: arch.profile,
        });
      }
      if (failedNodes[arch.profile.peerId]) {
        failedNodes[arch.profile.peerId] = undefined;
      }

      p2pNode.hangUp(addr);
    } catch (e) {
      fails++;
      failedNodes[arch.profile.peerId] = { addr, arch };
    }
  };

  // INITIAL DIAL
  await new Promise<void>(resolve => {
    archaeologists.map(async arch => {
      const profile = arch.profile;

      const peerIdParts = profile.peerId.split(":");

      const addr = multiaddr(`/dns4/${peerIdParts[0]}/tcp/443/wss/p2p/${peerIdParts[1]}`);
      await tryDial(arch, addr);
      p2pNode.stop();

      if (dials + fails === wssProfiles.length) {
        resolve();
      }
    });
  });

  // RETRY FAILS FROM INITAIL DIAL
  let totalRetries = 0;
  while (fails) {
    totalRetries++;
    let failedNodesLength = Object.values(failedNodes).filter(val => !!val).length;
    console.log(`retrying ${failedNodesLength} failed dials`);

    await new Promise<void>(resolve => {
      let retries = 0;

      Object.keys(failedNodes).forEach(async peerId => {
        if (failedNodes[peerId]) {
          fails--;
          await tryDial(failedNodes[peerId]!.arch, failedNodes[peerId]!.addr);
          retries++;

          if (retries === failedNodesLength) resolve();
        }
      });
    });

    if (totalRetries === 5) break;
  }

  logging.notice(`Dials: ${dials}`);
  logging.notice(`Fails: ${fails}`);
  logging.error("---FINSISHED DIALING ARCHAEOLOGISTS---");

  return new Date(Date.now() + Number.parseInt(process.env.DIAL_INTERVAL_MS!));
}
