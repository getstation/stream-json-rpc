import { EventEmitter } from 'events';
import ipcchannel from '../src/ipcchannel';
import { IPCChannelPublic } from '../src/types';
import expect = require('expect');

describe('IPCChannel', () => {

  let process1: IPCChannelPublic;
  let process2: IPCChannelPublic;

  before(() => {
    const emitters = {
      process1: new EventEmitter(),
      process2: new EventEmitter(),
    };

    process1 = ipcchannel('process1', {
      send(id: string) {
        return (eventName: string, ...args: any[]) => {
          emitters[id].emit(eventName, ...args);
        };
      },
      on(eventName: string, callback: (...args: any[]) => void) {
        emitters.process1.on(eventName, callback);
      },
      removeListener(eventName: string, callback: (...args: any[]) => void) {
        emitters.process1.removeListener(eventName, callback);
      },
    });

    process2 = ipcchannel('process2', {
      send(id: string) {
        return (eventName: string, ...args: any[]) => {
          emitters[id].emit(eventName, ...args);
        };
      },
      on(eventName: string, callback: (...args: any[]) => void) {
        emitters.process2.on(eventName, callback);
      },
      removeListener(eventName: string, callback: (...args: any[]) => void) {
        emitters.process2.removeListener(eventName, callback);
      },
    });

    process1.initializeHandler(async (c: string, arg1: number) => {
      switch (c) {
        case 'inc':
          return arg1 + 1;
        default:
          return arg1;
      }
    });
  });

  it('should return given number as is', async () => {
    const result = await process2.remoteCall('process1', 'noop', [1]);
    expect(result).toBe(1);
  });

  it('should increment given number in remote process', async () => {
    const result = await process2.remoteCall('process1', 'inc', [1]);
    expect(result).toBe(2);
  });
});
