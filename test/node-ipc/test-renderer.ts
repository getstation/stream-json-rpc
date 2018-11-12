import * as ipc from 'node-ipc';
import ipcchannel from '../../src/ipcchannel';
import { IPCChannelPublic } from '../../src/types';
import { Args } from './types';

const getIPC = () => {
  ipc.config.appspace = 'magne4000-test-worker';
  ipc.config.id = 'client';
  ipc.config.silent = true;
  ipc.config.retry = 1000;
  ipc.connectTo('server', () => {
    ipc.of.server.on(
      'connect',
      () => {
        ipc.of.server.emit('socket.connected', { id: ipc.config.id });
      }
    );
  });
  return ipc.of.server;
};

const init = () => {
  const ipcClient = getIPC();

  const channel = ipcchannel('client', {
    send(_id: string) {
      return (eventName: string, ...args: any[]) => {
        ipcClient.emit(eventName, {
          args,
        } as Args);
      };
    },
    on(eventName: string, callback: (...args: any[]) => void) {
      const innerCallback = (innerArgs: Args) => {
        callback(innerArgs.args[0]);
      };
      ipcClient.on(eventName, innerCallback);
      return innerCallback;
    },
    removeListener(eventName: string, callback: (...args: any[]) => void) {
      ipcClient.off(eventName, callback);
    },
  });

  process.on('exit', () => ipcClient.stop());

  return channel;
};

describe('forwards actions to and from renderer', () => {
  let channel: IPCChannelPublic;

  before(async () => {
    channel = init();
  });

  it('should increment given number in remote process', (done) => {
    channel
      .remoteCall('server', 'inc', [1])
      .then((result) => {
        if (result === 2) return done();
        return done(new Error(`Unexpected result: ${result}`));
      });
  });
});
