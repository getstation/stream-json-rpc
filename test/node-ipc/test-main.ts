import * as ipc from 'node-ipc';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'server';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
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
    this.ipcClient.emit(this.socket, 'data', chunk.toString());
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const ipcClient = getIPC();
  const sockets = new Map();
  const channel = rpcchannel();

  ipcClient.on('socket.connected', (data, socket) => {
    sockets.set(data.id, socket);
    channel.setLink(data.id, new TestDuplex(ipcClient, socket));
  });

  channel.addRequestHandler('inc', ({ value }: any) => {
    return value + 1;
  });

  process.on('exit', () => ipcClient.stop());
};

init();
