import { Duplex } from 'stream';

export interface RPCRequestHandler<X, T, R> {
  (method: X, handler: (params: T) => R | Promise<R>, timeout?: number): () => void,
}

export interface RPCNotificationHandler<X, T> {
  (method: X, handler: (params: T) => void, timeout?: number): () => void,
}

export interface RPCRequest<T, R> {
  (targetId: string, method: string, params: T): Promise<R>,
}

export interface RPCNotify<T> {
  (targetId: string, method: string, params: T): void,
}

export interface RPCChannel {
  request: RPCRequest<any, any>,
  notify: RPCNotify<any>,
  addRequestHandler: RPCRequestHandler<any, any, any>,
  addNotificationHandler: RPCNotificationHandler<any, any>,
  setLink(targetId: string, duplex: Duplex): void,
  deleteLink(targetId: string): void,
}
