import * as crypto from 'crypto';
import { Observable, Observer, of, Subscription, throwError } from 'rxjs';
import { filter, mergeMap, take, tap, timeout } from 'rxjs/operators';
import { IPCChannel, IPCChannelListener, IPCRequest, IPCRequestHandler, IPCResponse } from './types';

// Most of the ideas here come from the great https://github.com/paulcbetts/electron-remote package

const d = require('debug')('electron-worker:methods');

const responseChannel = 'worker:response-channel';
const requestChannel = 'worker:request-channel';

let nextId = 1;

function getNextId(id: string) {
  return crypto
    .createHmac('sha256', 'worker')
    .update(id)
    .update(String(nextId += 1))
    .digest('hex');
}

/**
 * Turns an IPC channel into an Observable
 */
function listenToIpc<T>(ipc: IPCChannelListener, eventName: string): Observable<IPCResponse<T>> {
  return Observable.create((subj: Observer<IPCResponse<T>>) => {
    const listener = (response: IPCResponse<T>) => {
      d(`Got an event for ${eventName}: ${JSON.stringify(response)}`);
      subj.next(response);
    };

    d(`Setting up listener! ${eventName}`);
    ipc.on(eventName, listener);

    return new Subscription(() =>
      ipc.removeListener(eventName, listener)
    );
  });
}

/**
 * This method creates an Observable Promise that represents a future response
 * to a remoted call. It filters on ID, then cancels itself once either a
 * response is returned, or it times out.
 */
function listenerForId<T>(ipc: IPCChannelListener, id: string, t: number): Observable<T | undefined> {
  return listenToIpc<T>(ipc, responseChannel)
    .pipe(
      tap((x) => (`Got IPC! ${x.id} === ${id}; ${JSON.stringify(x)}`)),
      filter((receive) => Boolean(receive.id === id && id)),
      take(1),
      mergeMap((receive) => {
        if (receive.error) {
          const e = new Error(receive.error.message);
          e.stack = receive.error.stack;
          return throwError(e);
        }

        return of(receive.result);
      }),
      timeout(t),
    );
}

/**
 *
 */
export function remoteCall<T>(id: string, remoteId: string, channel: IPCChannel, eventName: string, args: any[], t: number) {
  const sender = channel.send(remoteId);
  const request: IPCRequest<any[]> = {
    id: getNextId(id),
    senderId: id,
    channel: eventName,
    args,
  };

  const ret = listenerForId<T>(channel, request.id, t);

  d(`Sending: ${JSON.stringify(request)}`);
  sender(requestChannel, request);
  return ret;
}

/**
 * Initializes the IPC listener that {executeJavaScriptMethod} will send IPC
 * messages to. You need to call this method in any process that you want to
 * execute remote methods on.
 */
export function initializeHandler<T, R>(id: string, channel: IPCChannel, handler: IPCRequestHandler<T, R>) {
  const listener = async (receive: IPCRequest<T>) => {
    d(`Got Message! ${JSON.stringify(receive)}`);
    const sender = channel.send(receive.senderId);

    const response: IPCResponse<R> = {
      id: receive.id,
      senderId: id,
    };

    try {
      response.result = await handler(receive);

      d(`Replying! ${JSON.stringify(response)}`);
      sender(responseChannel, response);
    } catch (err) {
      response.error = {
        message: err.message,
        stack: err.stack,
      };

      d(`Failed! ${JSON.stringify(response)}`);
      sender(responseChannel, response);
    }
  };

  d('Set up listener!');
  channel.on(requestChannel, listener);

  return new Subscription(() => channel.removeListener(requestChannel, listener));
}
