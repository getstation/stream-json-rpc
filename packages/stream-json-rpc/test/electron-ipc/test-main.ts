import { ipcMain } from 'electron';
import { JsonRpcError } from 'json-rpc-protocol';
import { ElectronIpcMainDuplex } from 'stream-electron-ipc';
import rpcchannel from '../../src/rpcchannel';

const longMessage = 'a'.repeat(100 * 1000);

const init = () => {
  ipcMain.on('socket.connected', (event: any) => {
    const channel = rpcchannel(new ElectronIpcMainDuplex(event.sender), {
      forwardErrors: true,
    });
    const peer = channel.peer('electron');
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });

    peer.setRequestHandler('throwJson', () => {
      throw new JsonRpcError('This is a JsonRpcError error');
    });

    peer.setRequestHandler('throw', () => {
      throw new Error('This is an error');
    });

    peer.setRequestHandler('hugeVal', () => {
      return longMessage;
    });
  });
};

init();
