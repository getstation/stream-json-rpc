import { ipcRenderer } from 'electron';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';
import { RPCChannel } from '../../src/types';

class TestDuplex extends Duplex {
  constructor() {
    super();
    ipcRenderer.on('data', (_: any, data: any) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    ipcRenderer.send('data', chunk.toString());
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const channel = rpcchannel();
  channel.setLink('main', new TestDuplex());
  ipcRenderer.send('socket.connected', 'renderer1');
  return channel;
};

describe('forwards actions to and from renderer', () => {
  let channel: RPCChannel;

  before(async () => {
    channel = init();
  });

  it('should increment given number in remote process', (done) => {
    channel
      .request('main', 'inc', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return done();
        return done(new Error(`Unexpected result: ${result}`));
      });
  });
});
