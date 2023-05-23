import { ipcMain, ipcRenderer, app } from 'electron';
import { Duplex } from 'stream';

const isRenderer = process.type === 'renderer';
const getSenderId = (e: any) => typeof e.senderId === 'number' ? e.senderId :
  typeof e.sender.id === 'number' ? e.sender.id : 0;
const getFullChannel = (channel: string, webContentsId: number) => `sei-${channel}-${webContentsId}`;

let remoteMain: any = undefined;
let remoteRenderer: any = undefined;

if (isRenderer) {
  remoteRenderer = require('@electron/remote');
} else {
  remoteMain = require('@electron/remote/main');
  remoteMain.initialize();

  // See https://github.com/electron/remote/issues/94#issuecomment-1024849702
  app.on('browser-window-created', (_, window) => {
    remoteMain.enable(window.webContents);
  });
}

export class ElectronIpcMainDuplex extends Duplex {
  webContents: Electron.WebContents;
  wcId: number;
  channel: string;

  constructor(webContents: Electron.WebContents, channel: string = 'data') {
    super();
    this.webContents = webContents;
    this.wcId = webContents.id;
    this.channel = getFullChannel(channel, 0);
    webContents.once('close' as any, () => {
      this.end();
    });
    webContents.once('destroyed', () => {
      this.destroy();
    });
    ipcMain.on(getFullChannel(channel, this.wcId), (_: any, data: Uint8Array) => {
      this.push(data);
    });

    // init connection
    this.webContents.send(channel);
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    this.webContents.send(this.channel, new Uint8Array(chunk));
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

export class ElectronIpcRendererDuplex extends Duplex {
  wcId: number;
  sendTo: (channel: string, ...args: any[]) => void;
  channel: string;

  constructor(webContentsId?: number, channel: string = 'data') {
    super();
    this.wcId = typeof webContentsId === 'number' ? webContentsId : 0;
    this.channel = getFullChannel(channel, remoteRenderer.getCurrentWebContents().id);
    if (this.wcId === 0) {
      // renderer to main
      this.sendTo = ipcRenderer.send.bind(ipcRenderer);
    } else {
      // renderer to renderer
      this.sendTo = ipcRenderer.sendTo.bind(ipcRenderer, this.wcId);
    }
    ipcRenderer.on(getFullChannel(channel, this.wcId), (_: any, data: Uint8Array) => {
      this.push(data);
    });

    // init connection
    this.sendTo(channel);
  }

  // tslint:disable-next-line
  _write(chunk: Buffer, _encoding: any, callback: Function) {
    this.sendTo(this.channel, new Uint8Array(chunk));
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
      duplex = new ElectronIpcRendererDuplex(senderId, channel || 'data');
    } else {
      duplex = new ElectronIpcMainDuplex(e.sender, channel || 'data');
    }
    if (!channel) {
      duplex.push(data);
    }
    callback(duplex);
  });
};
