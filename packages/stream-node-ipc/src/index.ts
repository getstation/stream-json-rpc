import { Socket } from 'net';
import * as ipc from 'node-ipc';
import { Duplex } from 'stream';
import { Client, Server } from './types';

export class NodeIpcServerDuplex extends Duplex {
  ipcClient: Server;
  socket: Socket;

  constructor(ipcClient: Server, socket: Socket) {
    super();
    this.ipcClient = ipcClient;
    this.socket = socket;

    ipcClient.on('data', data => {
      this.push(data);
    });

    ipcClient.on('socket.disconnected', (s: Socket) => {
      if (s === socket) {
        this.end();
        this.destroy();
      }
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

export class NodeIpcClientDuplex extends Duplex {
  ipcClient: Client;

  constructor(ipcClient: Client) {
    super();
    this.ipcClient = ipcClient;

    ipcClient.on('data', data => {
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

export const getClient = (appspace: string, id: string = 'client'): Client => {
  ipc.config.appspace = appspace;
  ipc.config.id = id;
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

export const getServer = (appspace: string): Server => {
  ipc.config.appspace = appspace;
  ipc.config.id = 'server';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.config.rawBuffer = true;
  ipc.config.encoding = 'hex';
  ipc.serve(() => {});
  ipc.server.start();

  return ipc.server;
};

export const firstConnectionHandler = (ipcServer: Server, callback: (socket: NodeIpcServerDuplex) => void) => {
  const seensIds = new WeakSet<Socket>();
  const firstConnection = (_data: any, socket: Socket) => {
    if (seensIds.has(socket)) return;
    seensIds.add(socket);
    callback(new NodeIpcServerDuplex(ipcServer, socket));
  };
  ipcServer.on('data', firstConnection);

  return ipcServer;
};
