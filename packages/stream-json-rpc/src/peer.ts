import Peer, { JsonRpcError, JsonRpcPayload } from '@magne4000/json-rpc-peer';
import { RPCChannelOptions, RPCChannelPeer } from './types';

const callMethod = (fn: Function, args: any) => {
  return new Promise((resolve) => {
    resolve(fn(args));
  });
};

const withTimeout = (fn: Function, args: any, timeout: number, forwardErrors?: boolean) =>
  new Promise((resolve, reject) => {
    callMethod(fn, args)
      .then(resolve)
      .catch(e => {
        if (forwardErrors && typeof e.toJsonRpcError !== 'function') {
          e.toJsonRpcError = () => ({
            code: 1,
            message: e.message,
          });
        }
        reject(e);
      });
    if (timeout > 0) {
      setTimeout(reject, timeout, new JsonRpcError('timeout'));
    }
  });

const peerCallback = (
  requestHandlers: Map<string, RequestHandler>,
  notificationHandlers: Map<string, NotificationHandler>,
  options: RPCChannelOptions) =>
  (message: JsonRpcPayload) => {
    switch (message.type) {
      case 'request': {
        if (!requestHandlers.has(message.method)) {
          throw new JsonRpcError(`Method ${message.method} does not exists`);
        }
        const { timeout, handler } = requestHandlers.get(message.method)!;
        return withTimeout(handler, message.params, timeout, options.forwardErrors);
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

type RequestHandler = {
  timeout: number,
  handler: (params: any) => any,
};
type NotificationHandler = (params: any) => void;

export default class RPCPeer extends Peer implements RPCChannelPeer {
  public closed: boolean;
  protected requestHandlers: Map<string, RequestHandler>;
  protected notificationHandlers: Map<string, NotificationHandler>;
  protected defaultTimeout: number;

  constructor(options: RPCChannelOptions = {}) {
    const requestHandlers = new Map<string, RequestHandler>();
    const notificationHandlers = new Map<string, NotificationHandler>();
    super(peerCallback(requestHandlers, notificationHandlers, options));
    this.requestHandlers = requestHandlers;

    this.notificationHandlers = notificationHandlers;
    this.defaultTimeout = options.defaultRequestTimeout === undefined ? 5000 : options.defaultRequestTimeout;
    this.closed = false;
  }

  setRequestHandler(method: string, handler: (params: any) => any, timeout: number = this.defaultTimeout) {
    if (this.requestHandlers.has(method)) {
      throw new Error(`Method ${method} already handled`);
    }
    this.requestHandlers.set(method, {
      timeout,
      handler,
    });

    // Unsubscribe callback
    return () => {
      this.requestHandlers.delete(method);
    };
  }

  setNotificationHandler(method: string, handler: (params: any) => void) {
    if (this.notificationHandlers.has(method)) {
      throw new Error(`Method ${method} already handled`);
    }
    this.notificationHandlers.set(method, handler);

    // Unsubscribe callback
    return () => {
      this.notificationHandlers.delete(method);
    };
  }

  close() {
    this.closed = true;
    // Closes piped stream and remove events listeners
    this.push(null);
  }
}
