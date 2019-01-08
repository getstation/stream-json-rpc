import * as pump from 'pump';
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

  mux.once('peer_multiplex', (d: Duplex) => {
    d.on('error', e => {
      if ((e as any).__bypass) return;
      switch (e.message) {
        case 'carrier stream finished before duplex finished':
        case 'carrier stream ended before end message received':
          // For the use case of this lib, those 2 errors are considerer as warning
          d.emit('warn', e);
          break;
        default:
          (e as any).__bypass = true;
          d.emit('error', e);
      }
    });
  });

  handshakeObservable.subscribe();

  return {
    peer(linkId: string): RPCChannelPeer {
      const peer = new RPCPeer(options.defaultRequestTimeout);
      const sub = handshakeObservable
        .pipe(
          filter(([id]) => linkId === id),
          first(),
        ).subscribe(([, d]: [string, Duplex]) => {
          pump(d, peer);
        });
      const peerWrapper: Duplex = mux.multiplex({
        handshake_data: Buffer.from(linkId),
      });
      pump(peer, peerWrapper);
      peer.on('end', () => {
        sub.unsubscribe();
        peerWrapper.unpipe(peer);
        peerWrapper.emit('end');
        peerWrapper.destroy();
      });
      peerWrapper.on('warn', (e) => {
        peer.close();
        peer.emit('error', e);
      });
      mux.on('finish', () => {
        peer.close();
      });
      return peer;
    },
    _mux: mux,
  };
}
