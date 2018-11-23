import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import rpcchannel from '../src/rpcchannel';
import { RPCChannel } from '../src/types';
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

describe('IPCChannel', () => {

  let process1: RPCChannel;
  let process2: RPCChannel;
  let notifyCalled: boolean;

  before(() => {
    const eventemitter1 = new EventEmitter();
    const eventemitter2 = new EventEmitter();
    const duplex1 = new TestDuplex(eventemitter1, eventemitter2);
    const duplex2 = new TestDuplex(eventemitter2, eventemitter1);

    // process 1
    process1 = rpcchannel();
    process1.setLink('process2', duplex2);
    process1.addRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
    process1.addRequestHandler('wait', ({ value }: any) => {
      return new Promise(resolve => {
        setTimeout(resolve, value);
      });
    }, 500);
    process1.addNotificationHandler('notify', () => {
      notifyCalled = true;
    });

    // process 2
    process2 = rpcchannel();
    process2.setLink('process1', duplex1);
    process2.addRequestHandler('dec', ({ value }: any) => {
      return value - 1;
    });
  });

  beforeEach(() => {
    notifyCalled = false;
  });

  it('should reject request for invalid method', async () => {
    const result = process2.request('process1', 'noop', {
      value: 1,
    });
    return assert.isRejected(result);
  });

  it('should increment given number in remote process', async () => {
    const result = process2.request('process1', 'inc', {
      value: 1,
    });
    return assert.eventually.equal(result, 2);
  });

  it('should decrement given number in remote process', async () => {
    const result = process1.request('process2', 'dec', {
      value: 1,
    });
    return assert.eventually.equal(result, 0);
  });

  it('should timeout', async () => {
    const result = process2.request('process1', 'wait', {
      value: 1000,
    });
    return assert.isRejected(result, 'timeout');
  });

  it('should notify other process', async () => {
    assert.equal(notifyCalled, false);
    await process2.notify('process1', 'notify', {
      value: 1,
    });
    return assert.equal(notifyCalled, true);
  });
});
