import { ipcRenderer } from 'electron';
import { ElectronIpcRendererDuplex } from 'stream-electron-ipc';
import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

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

  it('should increment given number in remote process', (done) => {
    peer
      .request('inc', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return done();
        return done(new Error(`Unexpected result: ${result}`));
      });
  });
});
