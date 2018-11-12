import ipcchannel from '../../src/ipcchannel';
import { IPCChannelPublic, IPCRequest } from '../../src/types';
import * as ipc from 'node-ipc';
import { Args } from './types';

let channel: IPCChannelPublic;

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'server';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.serve(() => {});
  ipc.server.start();
  return ipc.server;
};

const init = () => {
  const ipcClient = getIPC();
  const sockets = new Map();
  const callbacks = new WeakMap();

  ipcClient.on('socket.connected', (data, socket) => {
    sockets.set(data.id, socket);
  });

  channel = ipcchannel('client', {
    send(id: string) {
      return (eventName: string, value: any) => {
        console.log(id, eventName, value)
        ipcClient.emit(sockets.get(id), eventName, {
          args: [value],
        } as Args);
      };
    },
    on(eventName: string, callback: (args: any) => void) {
      // TODO add a transform method ?
      callbacks.set(callback, (innerArgs: Args) => {
        callback(innerArgs.args[0]);
      });
      ipcClient.on(eventName, callbacks.get(callback));
    },
    removeListener(eventName: string, callback: (args: any) => void) {
      ipcClient.off(eventName, callbacks.get(callback));
    },
  });

  channel.initializeHandler(async (request: IPCRequest<number[]>) => {
    const n = request.args[0];
    switch (request.channel) {
      case 'inc':
        return n + 1;
      default:
        return n;
    }
  });

  process.on('exit', () => ipcClient.stop());
};

init();
