import { ipcMain } from 'electron';
import { ElectronIpcMainDuplex } from 'stream-electron-ipc';
import rpcchannel from '../../src/rpcchannel';

const init = () => {
  ipcMain.on('socket.connected', (event: any) => {
    const channel = rpcchannel(new ElectronIpcMainDuplex(event.sender));
    const peer = channel.peer('electron');
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
  });
};

init();
