import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import rpcchannel from '../src/rpcchannel';
import { RPCChannel, RPCChannelPeer } from '../src/types';
import { assert } from './mocha.opts';

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
  let peer1to2: RPCChannelPeer;
  let peer1to2bis: RPCChannelPeer;
  let peer2to1: RPCChannelPeer;
  let peer2to1bis: RPCChannelPeer;
  let notifyCalled: boolean;

  before(() => {
    const eventemitter1 = new EventEmitter();
    const eventemitter2 = new EventEmitter();
    const duplex1 = new TestDuplex(eventemitter1, eventemitter2);
    const duplex2 = new TestDuplex(eventemitter2, eventemitter1);

    // process 1
    process1 = rpcchannel(duplex2);
    peer1to2 = process1.peer();
    peer1to2bis = process1.peer();
    peer1to2.setRequestHandler('incby1', ({ value }: any) => {
      return value + 1;
    });
    peer1to2bis.setRequestHandler('incby2', ({ value }: any) => {
      return value + 2;
    });

    peer1to2.setRequestHandler('wait', ({ value }: any) => {
      return new Promise(resolve => {
        setTimeout(resolve, value);
      });
    }, 500);
    peer1to2.setNotificationHandler('notify', () => {
      notifyCalled = true;
    });

    // process 2
    process2 = rpcchannel(duplex1);
    peer2to1 = process2.peer();
    peer2to1bis = process2.peer();
    peer2to1.setRequestHandler('dec', ({ value }: any) => {
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

  it('should increment given number by 1 in remote process', async () => {
    const result = peer2to1.request('incby1', {
      value: 1,
    });
    return assert.eventually.equal(result, 2);
  });

  it('should increment given number by 2 in remote process', async () => {
    const result = peer2to1bis.request('incby2', {
      value: 1,
    });
    return assert.eventually.equal(result, 3);
  });

  it('should throw error because incby1 does not exists on the other end', async () => {
    const result = peer2to1bis.request('incby1', {
      value: 1,
    });
    return assert.isRejected(result, 'incby1');
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
