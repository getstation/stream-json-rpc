import { ipcMain, ipcRenderer } from 'electron';
import { Duplex } from 'stream';

const isRenderer = process.type === 'renderer';
const getSenderId = (e: any) => typeof e.senderId === 'number' ? e.senderId :
  typeof e.sender.id === 'number' ? e.sender.id : 0;

export class ElectronIpcMainDuplex extends Duplex {
  webContents: Electron.WebContents;
  wcId: number;

  constructor(webContents: Electron.WebContents) {
    super();
    this.webContents = webContents;
    this.wcId = webContents.id;
    webContents.once('close' as any, () => {
      this.end();
    });
    webContents.once('destroyed', () => {
      this.destroy();
    });
    ipcMain.on('data', (e: any, data: Uint8Array) => {
      if (getSenderId(e) === this.wcId) {
        this.push(data);
      }
    });
  }

  initConnection(channel: string) {
    this.webContents.send(channel);
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
  wcId: number;
  sendTo: (channel: string, ...args: any[]) => void;

  constructor(webContentsId?: number) {
    super();
    this.wcId = typeof webContentsId === 'number' ? webContentsId : 0;
    if (this.wcId === 0) {
      // renderer to main
      this.sendTo = ipcRenderer.send.bind(ipcRenderer);
    } else {
      // renderer to renderer
      this.sendTo = ipcRenderer.sendTo.bind(ipcRenderer, this.wcId);
    }
    ipcRenderer.on('data', (e: any, data: Uint8Array) => {
      if (getSenderId(e) === this.wcId) {
        this.push(data);
      }
    });
  }

  initConnection(channel: string) {
    this.sendTo(channel);
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    this.sendTo('data', new Uint8Array(chunk));
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

export const firstConnectionHandler = (callback: (socket: Duplex) => void, channel?: string) => {
  const seensIds = new Set<number>();
  (isRenderer ? ipcRenderer : ipcMain).on(channel || 'data', (e: any, data: any) => {
    const senderId = getSenderId(e);
    if (!channel) { // default channel is 'data', and we just listen for first bytes received, not a particular event
      if (seensIds.has(senderId)) return;
      seensIds.add(senderId);
    }
    let duplex: Duplex;
    if (isRenderer) {
      duplex = new ElectronIpcRendererDuplex(senderId);
    } else {
      duplex = new ElectronIpcMainDuplex(e.sender);
    }
    duplex.push(data);
    callback(duplex);
  });
};
