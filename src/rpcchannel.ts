// FIXME get back to trunk when https://github.com/JsCommunity/json-rpc-peer/pull/56 is merged
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelPeer } from './types';

export default function rpcchannel(defaultRequestTimeout?: number): RPCChannel {
  return {
    connect(duplex: Duplex): RPCChannelPeer {
      const peer = new RPCPeer(defaultRequestTimeout);
      peer.pipe(duplex).pipe(peer);
      return peer;
    },
  };
}
