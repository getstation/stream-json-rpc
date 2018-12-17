import { fromEvent } from 'rxjs';
import { filter, first, map, shareReplay } from 'rxjs/operators';
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelOptions, RPCChannelPeer } from './types';

const { BPMux } = require('bpmux');

export default function rpcchannel(duplex: Duplex, options: RPCChannelOptions = {}): RPCChannel {
  const mux = new BPMux(duplex);
  const handshakeObservable = fromEvent(mux, 'handshake')
    .pipe(
      map(([d, data, pause]: [Duplex, Buffer, Function | null]) => {
        const linkId = data.toString();
        if (pause) pause();
        return [linkId, d];
      }),
      shareReplay(10, 2000),
    );

  handshakeObservable.subscribe();

  return {
    peer(linkId: string): RPCChannelPeer {
      const peer = new RPCPeer(options.defaultRequestTimeout);
      handshakeObservable
        .pipe(
          filter(([id]) => linkId === id),
          first(),
        ).subscribe(([, d]: [string, Duplex]) => {
          d.pipe(peer);
        });
      const peerWrapper: Duplex = mux.multiplex({
        handshake_data: Buffer.from(linkId),
      });
      peer.pipe(peerWrapper);
      peerWrapper.on('end', () => {
        peerWrapper.unpipe(peer);
        peerWrapper.destroy();
      });
      return peer;
    },
  };
}
