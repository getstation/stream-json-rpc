// @ts-ignore: no declaration file
import Peer from 'json-rpc-peer';
import { JsonRpcError, JsonRpcPayload } from 'json-rpc-protocol';
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
  const links = new Map<string, {
    peer: Peer,
    duplex: Duplex,
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
      case 'response':
        return message.result;
      case 'error':
        console.error(message.error);
        throw new Error(message.error.message);
    }
  };

  return {
    addRequestHandler(method: string, handler: (params: any) => any, timeout: number = defaultTimeout) {
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
    addNotificationHandler(method: string, handler: (params: any) => void) {
      if (notificationHandlers.has(method)) {
        throw new Error(`Method ${method} already handled`);
      }
      notificationHandlers.set(method, handler);

      // Unsubscribe callback
      return () => {
        notificationHandlers.delete(method);
      };
    },
    request(targetId: string, method: string, params: any) {
      if (!links.has(targetId)) throw new Error(`Unknown target ${targetId}`);
      return links.get(targetId)!.peer.request(method, params);
    },
    notify(targetId: string, method: string, params: any) {
      if (!links.has(targetId)) throw new Error(`Unknown target ${targetId}`);
      links.get(targetId)!.peer.notify(method, params);
    },
    setLink(targetId: string, duplex: Duplex): void {
      const peer = new Peer(peerCallback);
      peer.pipe(duplex).pipe(peer);
      links.set(targetId, {
        peer,
        duplex,
      });
    },
    deleteLink(targetId: string): void {
      if (!links.has(targetId)) return;
      const { peer, duplex } = links.get(targetId)!;
      peer.unpipe(duplex).unpipe(peer);
      links.delete(targetId);
    },
  };
}
