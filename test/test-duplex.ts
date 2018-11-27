import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import rpcchannel from '../src';
import { RPCChannel } from '../src/types';
import { assert } from './mocha.opts';
import Peer from '@magne4000/json-rpc-peer';

class TestDuplex extends Duplex {
  w: EventEmitter;

  constructor(r: EventEmitter, w: EventEmitter) {
    super();
    this.w = w;
    r.on('data', data => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.w.emit('data', chunk);
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

describe('Simple Duplex', () => {

  let process1: RPCChannel;
  let process2: RPCChannel;
  let peer1to2: Peer;
  let peer2to1: Peer;
  let notifyCalled: boolean;

  before(() => {
    const eventemitter1 = new EventEmitter();
    const eventemitter2 = new EventEmitter();
    const duplex1 = new TestDuplex(eventemitter1, eventemitter2);
    const duplex2 = new TestDuplex(eventemitter2, eventemitter1);

    // process 1
    process1 = rpcchannel();
    peer1to2 = process1.connect(duplex2);
    process1.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
    process1.setRequestHandler('wait', ({ value }: any) => {
      return new Promise(resolve => {
        setTimeout(resolve, value);
      });
    }, 500);
    process1.setNotificationHandler('notify', () => {
      notifyCalled = true;
    });

    // process 2
    process2 = rpcchannel();
    peer2to1 = process2.connect(duplex1);
    process2.setRequestHandler('dec', ({ value }: any) => {
      return value - 1;
    });
  });

  beforeEach(() => {
    notifyCalled = false;
  });

  it('should reject request for invalid method', async () => {
    const result = peer2to1.request('noop', {
      value: 1,
    });
    return assert.isRejected(result);
  });

  it('should increment given number in remote process', async () => {
    const result = peer2to1.request('inc', {
      value: 1,
    });
    return assert.eventually.equal(result, 2);
  });

  it('should decrement given number in remote process', async () => {
    const result = peer1to2.request('dec', {
      value: 1,
    });
    return assert.eventually.equal(result, 0);
  });

  it('should timeout', async () => {
    const result = peer2to1.request('wait', {
      value: 1000,
    });
    return assert.isRejected(result, 'timeout');
  });

  it('should notify other process', async () => {
    assert.equal(notifyCalled, false);
    await peer2to1.notify('notify', {
      value: 1,
    });
    return assert.equal(notifyCalled, true);
  });
});
