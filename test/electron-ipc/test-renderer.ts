import { ipcRenderer } from 'electron';
import { Duplex } from 'stream';
import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

class TestDuplex extends Duplex {
  constructor() {
    super();
    ipcRenderer.on('data', (_: any, data: Uint8Array) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    ipcRenderer.send('data', new Uint8Array(chunk));
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const channel = rpcchannel(new TestDuplex());
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
