// FIXME get back to trunk when https://github.com/JsCommunity/json-rpc-peer/pull/56 is merged
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelOptions, RPCChannelPeer } from './types';

const { BPMux } = require('bpmux');

export default function rpcchannel(duplex: Duplex, options: RPCChannelOptions = {}): RPCChannel {
  const mux = new BPMux(duplex);
  return {
    peer(): RPCChannelPeer {
      const peer = new RPCPeer(options.defaultRequestTimeout);
      const peerWrapper = mux.multiplex();
      peer.pipe(peerWrapper).pipe(peer);
      return peer;
    },
  };
}
