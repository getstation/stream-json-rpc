import { ipcMain } from 'electron';
import { Duplex } from 'stream';
import rpcchannel from '../../src/rpcchannel';

class TestDuplex extends Duplex {
  webContents: Electron.WebContents;

  constructor(webContents: Electron.WebContents) {
    super();
    this.webContents = webContents;
    ipcMain.on('data', (_: any, data: any) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.webContents.send('data', chunk.toString());
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

const init = () => {
  const channel = rpcchannel();

  ipcMain.on('socket.connected', (event: any, name: string) => {
    channel.setLink(name, new TestDuplex(event.sender));
  });

  channel.addRequestHandler('inc', ({ value }: any) => {
    return value + 1;
  });
};

init();
