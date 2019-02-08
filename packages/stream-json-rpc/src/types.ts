import Peer from '@magne4000/json-rpc-peer';

export interface RPCRequestHandler<X, T, R> {
  (method: X, handler: (params: T) => R | Promise<R>, timeout?: number): () => void,
}

export interface RPCNotificationHandler<X, T> {
  (method: X, handler: (params: T) => void, timeout?: number): () => void,
}

export interface RPCChannelOptions {
  defaultRequestTimeout?: number,
  forwardErrors?: boolean,
}

export interface RPCChannel {
  peer(linkId: string): RPCChannelPeer,
}

export interface RPCChannelPeer extends Peer {
  id: string;
  setRequestHandler: RPCRequestHandler<any, any, any>;
  setNotificationHandler: RPCNotificationHandler<any, any>;
  close: () => void;
  closed: boolean;
}
