import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import rpcchannel from '../src/rpcchannel';
import { RPCChannel, RPCChannelPeer } from '../src/types';
import { assert } from './mocha.opts';

const withTimeout = (p: Promise<any>, timeout: number) =>
  new Promise((resolve, reject) => {
    p.then(resolve).catch(reject);
    setTimeout(reject, timeout, new Error('timeout'));
  });

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
  let peer2to1ter: RPCChannelPeer;
  let notifyCalled: boolean;
  let duplex1: TestDuplex;
  let duplex2: TestDuplex;
  const longMessage = 'a'.repeat(100 * 1000);

  before(() => {
    const eventemitter1 = new EventEmitter();
    const eventemitter2 = new EventEmitter();
    duplex1 = new TestDuplex(eventemitter1, eventemitter2);
    duplex2 = new TestDuplex(eventemitter2, eventemitter1);

    // process 1
    process1 = rpcchannel(duplex2);
    peer1to2 = process1.peer('1<->2');
    peer1to2bis = process1.peer('1b<->2b');
    peer1to2.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
    peer1to2.setRequestHandler('hugeVal', () => {
      return longMessage;
    });
    peer1to2bis.setRequestHandler('inc', ({ value }: any) => {
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
    peer2to1 = process2.peer('1<->2');
    peer2to1bis = process2.peer('1b<->2b');
    peer2to1ter = process2.peer('1t<->2t');
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
    const result = peer2to1.request('inc', {
      value: 1,
    });
    return assert.eventually.equal(result, 2);
  });

  it('should return a large value', async () => {
    const result = peer2to1.request('hugeVal');
    return assert.eventually.equal(result, longMessage);
  });

  it('should increment given number by 2 in remote process', async () => {
    const result = peer2to1bis.request('inc', {
      value: 1,
    });
    return assert.eventually.equal(result, 3);
  });

  it('should decrement given number in remote process', async () => {
    const result = peer1to2.request('dec', {
      value: 1,
    });
    return assert.eventually.equal(result, 0);
  });

  it('should be rejected because method timeout', async () => {
    const result = peer2to1.request('wait', {
      value: 1000,
    });
    return assert.isRejected(result, 'timeout');
  });

  it('should timeout because peer is not connected to destination', async () => {
    const result = withTimeout(peer2to1ter.request('pizza'), 1000);
    return assert.isRejected(result, 'timeout');
  });

  it('should notify other process', async () => {
    assert.equal(notifyCalled, false);
    await peer2to1.notify('notify', {
      value: 1,
    });
    return assert.equal(notifyCalled, true);
  });

  it('should propagate end event upon destroy', async () => {
    await new Promise((resolve) => {
      peer2to1.on('end', resolve);
      peer2to1.destroy();
    });

    assert.equal(peer2to1.closed, true);
  });

  it('should unpipe all peers upon socket close', async () => {
    peer1to2bis.on('error', () => {
      assert.ok(true);
    });
    peer1to2.on('error', () => {
      assert.fail();
    });

    duplex1.destroy();

    await new Promise(resolve => setTimeout(resolve, 500));

    // assert.equal(process2._mux.duplexes.size, 0);
  });

});
