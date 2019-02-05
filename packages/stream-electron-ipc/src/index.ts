import { ipcMain, ipcRenderer } from 'electron';
import { Duplex } from 'stream';

export class ElectronIpcMainDuplex extends Duplex {
  webContents: Electron.WebContents;
  wcId: number;

  constructor(webContents: Electron.WebContents) {
    super();
    this.webContents = webContents;
    this.wcId = webContents.id;
    webContents.once('destroyed', () => {
      this.end();
    });
    ipcMain.on('data', (e: Electron.Event, data: Uint8Array) => {
      if (e.sender.id === this.wcId) {
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

export const firstConnectionHandler = (callback: (socket: ElectronIpcMainDuplex) => void) => {
  const seensIds = new WeakSet<Electron.WebContents>();
  ipcMain.on('data', (e: Electron.Event, data: any) => {
    if (seensIds.has(e.sender)) return;
    seensIds.add(e.sender);
    const duplex = new ElectronIpcMainDuplex(e.sender);
    duplex.push(data);
    callback(duplex);
  });
};
