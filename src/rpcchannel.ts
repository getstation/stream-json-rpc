// FIXME get back to trunk when https://github.com/JsCommunity/json-rpc-peer/pull/56 is merged
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelOptions, RPCChannelPeer } from './types';

export default function rpcchannel(duplex: Duplex, options: RPCChannelOptions = {}): RPCChannel {
  return {
    peer(): RPCChannelPeer {
      const peer = new RPCPeer(options.defaultRequestTimeout);
      peer.pipe(duplex).pipe(peer);
      return peer;
    },
  };
}
