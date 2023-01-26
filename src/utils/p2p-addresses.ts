import "dotenv/config";
import { exit } from "node:process";
import { logging } from "./logger";

export const SIGNAL_SERVER_LIST = ["sig.encryptafile.com"];

function getLocalStarSignallingPort() {
  if (!process.env.DEV_SIGNAL_SERVER_PORT) {
    logging.error(
      "DEV_SIGNAL_SERVER_PORT not set in .env\nAdd this environment variable to set the port the local signalling server listens on"
    );
    exit();
  }

  const starServerPort = Number.parseInt(process.env.DEV_SIGNAL_SERVER_PORT);

  if (Number.isNaN(starServerPort)) {
    logging.error("DEV_SIGNAL_SERVER_PORT  .env is not a valid integer");
    exit();
  }

  return starServerPort;
}

const genListenAddresses = (servers: string[], peerId?: string, isLocal?: boolean): string[] => {
  return process.env.DOMAIN ? wssListenAddress() : ssListenAddresses(isLocal === true, servers, peerId);
};

const wssListenAddress = (): string[] => {
  logging.debug("using websockets");
  return [`/ip4/127.0.0.1/tcp/9000/wss`];
};

const ssListenAddresses = (isLocal: boolean, servers: string[], peerId?: string): string[] => {
  logging.debug("using signalling server");
  return servers.map(server => {
    const ssAddress = isLocal
      ? `/ip4/${server}/tcp/${getLocalStarSignallingPort()}/ws/p2p-webrtc-star`
      : `/dns4/${server}/tcp/443/wss/p2p-webrtc-star`;

    return peerId ? `${ssAddress}/p2p/${peerId}` : ssAddress;
  });
};

export { genListenAddresses };
