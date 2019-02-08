import { ipcRenderer } from 'electron';
import { ElectronIpcRendererDuplex } from 'stream-electron-ipc';
import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

const longMessage = 'a'.repeat(100 * 1000);

const init = () => {
  const channel = rpcchannel(new ElectronIpcRendererDuplex());
  const mainPeer = channel.peer('electron');
  ipcRenderer.send('socket.connected', 'renderer1');
  return mainPeer;
};

describe('forwards actions to and from renderer', () => {
  let peer: RPCChannelPeer;

  before(async () => {
    peer = init();
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
