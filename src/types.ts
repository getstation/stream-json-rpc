import { Subscription } from 'rxjs';

export interface Callback {
  (...args: any[]): void;
}

export interface IPCChannelPublic {
  remoteCall: <T>(remoteId: string, eventName: string, args: any[], t?: number) => Promise<T | undefined>,
  initializeHandler: <T extends any[], R>(handler: IPCRequestHandler<T, R>) => Subscription,
}

export interface IPCChannelListener {
  on: (eventName: string, callback: Callback) => Callback | void,
  removeListener: (eventName: string, callback: Callback) => void,
}

export interface IPCChannelEmitter {
  send: (eventName: string, ...args: any[]) => void,
}

export interface IPCChannel extends IPCChannelListener {
  send(id: string): IPCChannelEmitter['send'],
}

export interface IPCRequest<R> {
  id: string,
  senderId: string,
  channel: string,
  args: R,
}

export interface IPCResponse<T> {
  id: string,
  senderId: string,
  result?: T,
  error?: {
    message: string,
    stack: string,
  },
}

export interface IPCRequestHandler<T extends any[], R> {
  (channel: string, ...args: T): Promise<R>,
}
