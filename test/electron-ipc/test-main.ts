import { ipcMain } from 'electron';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';

class TestDuplex extends Duplex {
  webContents: Electron.WebContents;

  constructor(webContents: Electron.WebContents) {
    super();
    this.webContents = webContents;
    ipcMain.on('data', (_: any, data: Uint8Array) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    this.webContents.send('data', new Uint8Array(chunk));
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  ipcMain.on('socket.connected', (event: any) => {
    const channel = rpcchannel(new TestDuplex(event.sender));
    const peer = channel.peer('electron');
    peer.setRequestHandler('inc', ({ value }: any) => {
      return value + 1;
    });
  });
};

init();
