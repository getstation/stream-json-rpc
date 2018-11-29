import * as ipc from 'node-ipc';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'server';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.config.rawBuffer = true;
  ipc.config.encoding = 'hex';
  ipc.serve(() => {});
  ipc.server.start();
  return ipc.server;
};

class TestDuplex extends Duplex {
  ipcClient: ReturnType<typeof getIPC>;
  socket: any;

  constructor(ipcClient: ReturnType<typeof getIPC>, socket: any) {
    super();
    this.ipcClient = ipcClient;
    this.socket = socket;

    ipcClient.on('data', data => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.ipcClient.emit(this.socket, chunk);
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const ipcClient = getIPC();
  const sockets = new Map();

  const firstConnection = (data: Buffer, socket: any) => {
    const id = data.toString('utf-8');
    sockets.set(id, socket);
    const channel = rpcchannel(new TestDuplex(ipcClient, socket));
    const peer = channel.peer();
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
    ipcClient.off('data', firstConnection);
  };
  ipcClient.on('data', firstConnection);

  process.on('exit', () => ipcClient.stop());
};
init();
