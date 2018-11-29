import * as ipc from 'node-ipc';
import { Duplex } from 'stream';
import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'client';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.config.rawBuffer = true;
  ipc.config.encoding = 'hex';
  ipc.connectTo('server', () => {
    ipc.of.server.on(
      'connect',
      () => {
        ipc.of.server.emit(Buffer.from(ipc.config.id, 'utf-8'));
      }
    );
  });
  return ipc.of.server;
};

class TestDuplex extends Duplex {
  ipcClient: any;

  constructor(ipcClient: ReturnType<typeof getIPC>) {
    super();
    this.ipcClient = ipcClient;

    ipcClient.on('data', (data: any) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.ipcClient.emit(chunk);
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const ipcClient = getIPC();

  const channel = rpcchannel(new TestDuplex(ipcClient));
  const serverPeer = channel.peer();

  process.on('exit', () => ipcClient.stop());

  return serverPeer;
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
