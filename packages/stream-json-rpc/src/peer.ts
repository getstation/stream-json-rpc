import Peer, { JsonRpcError, JsonRpcParamsSchema, JsonRpcPayload, parse } from '@magne4000/json-rpc-peer';
import { wrapError } from './errors';
import { RPCChannelOptions, RPCChannelPeer } from './types';

const uuidv4 = require('uuid/v4');

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
            data: {
              stack: e.stack,
            },
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
  public id: string;
  protected requestHandlers: Map<string, RequestHandler>;
  protected notificationHandlers: Map<string, NotificationHandler>;
  protected defaultTimeout: number;
  protected stallingMessage: string;

  constructor(options: RPCChannelOptions = {}) {
    const requestHandlers = new Map<string, RequestHandler>();
    const notificationHandlers = new Map<string, NotificationHandler>();
    super(peerCallback(requestHandlers, notificationHandlers, options));
    this.id = uuidv4();
    this.requestHandlers = requestHandlers;

    this.notificationHandlers = notificationHandlers;
    this.defaultTimeout = options.defaultRequestTimeout === undefined ? 5000 : options.defaultRequestTimeout;
    this.closed = false;
    this.stallingMessage = '';
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

  request(method: string, params?: JsonRpcParamsSchema): Promise<any> {
    return new Promise((resolve, reject) => {
      super.request(method, params)
        .then(resolve)
        .catch((e: JsonRpcError) => {
          reject(wrapError(e));
        });
    });
  }

  public write (...args: any[]): boolean {
    let cb;
    const n = args.length;
    if (n > 1 && typeof (cb = args[n - 1]) === 'function') {
      process.nextTick(cb);
    }

    const message = String(args[0]);

    // This is to handle long message that are split in chunk by streams.
    // The goal is to wait for the message to be complete before calling `exec`.
    const fullMessage = this.stallingMessage + message;
    try {
      parse(fullMessage);
      this.stallingMessage = '';
      super.write(fullMessage);
    } catch (e) {
      this.stallingMessage = fullMessage;
    }

    // indicates that other calls to `write` are allowed
    return true;
  }

  close() {
    this.closed = true;
    // Closes piped stream and remove events listeners
    this.push(null);
  }
}
