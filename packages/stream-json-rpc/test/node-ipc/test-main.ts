import { getServer, NodeIpcServerDuplex } from 'stream-node-ipc';
import rpcchannel from '../../src/rpcchannel';

const init = () => {
  const ipcClient = getServer('magne4000-test-worker');

  const newClientConnection = (_data: Buffer, socket: any) => {
    const channel = rpcchannel(new NodeIpcServerDuplex(ipcClient, socket));
    const peer = channel.peer('node-ipc');
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
    ipcClient.off('data', newClientConnection);
  };
  ipcClient.on('data', newClientConnection);

  process.on('exit', () => ipcClient.stop());
};
init();
