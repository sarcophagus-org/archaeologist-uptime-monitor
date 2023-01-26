import { webRTCStar } from "@libp2p/webrtc-star";
import wrtc from "@koush/wrtc";
import { kadDHT } from "@libp2p/kad-dht";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { bootstrap } from "@libp2p/bootstrap";
import { Libp2pOptions } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { logging } from "./logger";

interface NodeConfigParams {
  bootstrapList?: string[];
  isBootstrap?: boolean;
  autoDial?: boolean;
}

export const SIGNAL_SERVER_LIST = ["sig.encryptafile.com"];
const DHT_PROTOCOL_PREFIX = "/archaeologist-uptime-monitor";
const domain = process.env.DOMAIN;

const dht = kadDHT({
  protocolPrefix: DHT_PROTOCOL_PREFIX,
  clientMode: false,
});

const webRtcStar = webRTCStar({ wrtc });

export class NodeConfig {
  public configObj: Libp2pOptions = {
    transports: [domain ? webSockets() : webRtcStar.transport],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    dht,
    // @ts-ignore
    peerDiscovery: [webRtcStar.discovery],
    connectionManager: {
      autoDial: false,
    },
  };

  constructor(options: NodeConfigParams = {}) {
    if (!domain) {
      // @ts-ignore
      this.configObj.peerDiscovery!.push(webRtcStar.discovery);
    }

    if (options.bootstrapList) {
      this.configObj.peerDiscovery!.push(
        bootstrap({
          list: options.bootstrapList,
        })
      );
    }

    if (options.isBootstrap) {
      this.configObj.relay = {
        enabled: true, // Allows you to dial and accept relayed connections. Does not make you a relay.
        hop: {
          enabled: true, // Allows you to be a relay for other peers
        },
      };
    }

    if (options.autoDial) {
      this.configObj.connectionManager = {
        autoDial: true,
      };
    }
  }

  public add(key: any, val: any) {
    Object.assign(this.configObj, {
      [key]: val,
    });
  }
}
