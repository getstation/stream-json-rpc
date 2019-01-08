import { Duplex } from 'stream';
import { ipcMain, ipcRenderer } from 'electron';

export class ElectronIpcMainDuplex extends Duplex {
  webContents: Electron.WebContents;

  constructor(webContents: Electron.WebContents) {
    super();
    this.webContents = webContents;
    webContents.once('destroyed', () => {
      this.end();
    });
    ipcMain.on('data', (e: Electron.Event, data: Uint8Array) => {
      if (e.sender.id === webContents.id) {
        this.push(data);
      }
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

export class ElectronIpcRendererDuplex extends Duplex {
  constructor() {
    super();
    ipcRenderer.on('data', (_: any, data: Uint8Array) => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    ipcRenderer.send('data', new Uint8Array(chunk));
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}
