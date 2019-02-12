import * as pump from 'pump';
import { Duplex } from 'stream';
import RPCPeer from './peer';
import { RPCChannel, RPCChannelOptions, RPCChannelPeer } from './types';

const multiplex = require('multiplex');

export default function rpcchannel(duplex: Duplex, options: RPCChannelOptions = {}): RPCChannel {
  const plex = multiplex();
  pump(plex, duplex, plex);

  return {
    peer(linkId: string, peerOptions: RPCChannelOptions = {}): RPCChannelPeer {
      const peer = new RPCPeer(Object.assign({}, options, peerOptions));
      const peerWrapper = plex.createSharedStream(linkId);
      pump(peer, peerWrapper, peer);
      peer.on('end', () => {
        peerWrapper.unpipe(peer);
        peerWrapper.emit('end');
        peerWrapper.destroy();
      });
      peerWrapper.on('warn', (e: Error) => {
        peer.destroy();
        peer.emit('error', e);
      });

      return peer;
    },
  };
}
