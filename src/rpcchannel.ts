import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelOptions, RPCChannelPeer } from './types';

const { BPMux } = require('bpmux');

export default function rpcchannel(duplex: Duplex, options: RPCChannelOptions = {}): RPCChannel {
  const mux = new BPMux(duplex);
  const em = new EventEmitter();

  mux.on('handshake', (d: Duplex, data: Buffer, pause: Function | null) => {
    const linkId = data.toString();
    if (pause) pause();
    em.emit(`handshake:${linkId}`, d);
  });

  return {
    peer(linkId: string): RPCChannelPeer {
      const peer = new RPCPeer(options.defaultRequestTimeout);
      em.once(`handshake:${linkId}`, (d: Duplex) => {
        d.pipe(peer);
      });
      const peerWrapper = mux.multiplex({
        handshake_data: Buffer.from(linkId),
      });
      peer.pipe(peerWrapper);
      return peer;
    },
  };
}
