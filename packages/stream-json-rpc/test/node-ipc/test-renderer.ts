import { getClient, NodeIpcClientDuplex } from 'stream-node-ipc';
import { RPCChannelPeer } from '../../src';
import rpcchannel from '../../src/rpcchannel';

const init = () => {
  const ipcClient = getClient('magne4000-test-worker');
  const channel = rpcchannel(new NodeIpcClientDuplex(ipcClient));
  return channel.peer('node-ipc');
};

describe('forwards actions to and from renderer', () => {
  let peer: RPCChannelPeer;

  before(async () => {
    peer = init();
  });

  it('should increment given number in remote process', (done) => {
    peer
      .request('inc', {
        value: 1,
      })
      .then((result) => {
        if (result === 2) return done();
        return done(new Error(`Unexpected result: ${result}`));
      });
  });
});
