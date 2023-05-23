import { ElectronIpcRendererDuplex } from 'stream-electron-ipc';

import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

const longMessage = 'a'.repeat(100 * 1000);

const init = () => {
  const duplex = new ElectronIpcRendererDuplex(0, 'test');
  const channel = rpcchannel(duplex);
  return channel.peer('electron');
};

describe('forwards actions to and from renderer', () => {
  let peer: RPCChannelPeer;

  before(async () => {
    peer = init();

    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
  });

  it('should increment given number in remote process', () => {
    return peer
      .request('inc', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return;
        throw new Error(`Unexpected result: ${result}`);
      });
  });

  it('should increment given number in remote process bis', () => {
    return peer
      .request('incremote', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return;
        throw new Error(`Unexpected result: ${result}`);
      });
  });

  it('should endure large values', () => {
    return peer
      .request('hugeVal')
      .then((result) => {
        if (result === longMessage) return;
        throw new Error(`Unexpected result: ${result}`);
      });
  });

  it('throws a JsonRpcError', () => {
    return peer
      .request('throwJson')
      .catch((e) => {
        if (e.toJsonRpcError().message === 'This is a JsonRpcError error') return;
        throw e;
      });
  });

  it('throws an encapsulated JsonRpcError error', () => {
    return peer
      .request('throw')
      .catch((e) => {
        const jsonError = e.toJsonRpcError();
        if (jsonError.message === 'This is an error' &&
          e.stack.split('\n').some((line: string) => line === 'Caused by: Error: This is an error')) return;
        throw e;
      });
  });
});
