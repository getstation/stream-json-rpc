// FIXME get back to trunk when https://github.com/JsCommunity/json-rpc-peer/pull/56 is merged
import Peer from '@magne4000/json-rpc-peer';
import { JsonRpcError, JsonRpcPayload } from '@magne4000/json-rpc-peer';
import { Duplex } from 'stream';
import { RPCChannel } from './types';

function withTimeout(fn: Function, args: any, timeout: number) {
  return new Promise((resolve, reject) => {
    Promise
      .resolve(fn(args))
      .then(resolve)
      .catch(reject);
    if (timeout > 0) {
      setTimeout(reject, timeout, new JsonRpcError('timeout'));
    }
  });
}

export default function rpcchannel(defaultRequestTimeout?: number): RPCChannel {
  const requestHandlers = new Map<string, {
    timeout: number,
    handler: (params: any) => any,
  }>();
  const notificationHandlers = new Map<string, (params: any) => void>();
  const defaultTimeout = defaultRequestTimeout === undefined ? 5000 : defaultRequestTimeout;

  const peerCallback = (message: JsonRpcPayload) => {
    switch (message.type) {
      case 'request': {
        if (!requestHandlers.has(message.method)) {
          throw new JsonRpcError(`Method ${message.method} does not exists`);
        }
        const { timeout, handler } = requestHandlers.get(message.method)!;
        return withTimeout(handler, message.params, timeout);
      }
      case 'notification': {
        if (!notificationHandlers.has(message.method)) {
          throw new JsonRpcError(`Method ${message.method} does not exists`);
        }
        const handler = notificationHandlers.get(message.method)!;
        return handler(message.params);
      }
    }
  };

  return {
    setRequestHandler(method: string, handler: (params: any) => any, timeout: number = defaultTimeout) {
      if (requestHandlers.has(method)) {
        throw new Error(`Method ${method} already handled`);
      }
      requestHandlers.set(method, {
        timeout,
        handler,
      });

      // Unsubscribe callback
      return () => {
        requestHandlers.delete(method);
      };
    },
    setNotificationHandler(method: string, handler: (params: any) => void) {
      if (notificationHandlers.has(method)) {
        throw new Error(`Method ${method} already handled`);
      }
      notificationHandlers.set(method, handler);

      // Unsubscribe callback
      return () => {
        notificationHandlers.delete(method);
      };
    },
    connect(duplex: Duplex): Peer {
      const peer = new Peer(peerCallback);
      peer.pipe(duplex).pipe(peer);
      return peer;
    },
  };
}
