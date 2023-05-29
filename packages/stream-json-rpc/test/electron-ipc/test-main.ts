import { JsonRpcError } from 'json-rpc-protocol';
import { initialize, firstConnectionHandler } from 'stream-electron-ipc';

import rpcchannel from '../../src/rpcchannel';

const longMessage = 'a'.repeat(100 * 1000);

const init = () => {
  initialize();

  firstConnectionHandler((duplex) => {
    const channel = rpcchannel(duplex, {
      forwardErrors: true,
    });
    const peer = channel.peer('electron');
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });

    peer.setRequestHandler('incremote', ({ value }: any) => {
      return peer.request('inc', { value });
    });

    peer.setRequestHandler('throwJson', () => {
      throw new JsonRpcError('This is a JsonRpcError error');
    });

    peer.setRequestHandler('throw', () => {
      throw new Error('This is an error');
    });

    peer.setRequestHandler('hugeVal', () => {
      return longMessage;
    });
  }, 'test');
};

init();
