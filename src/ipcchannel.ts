import { initializeHandler, remoteCall } from './methods';
import { IPCChannel, IPCChannelPublic, IPCRequestHandler } from './types';

export default function ipcchannel(id: string, channel: IPCChannel): IPCChannelPublic {
  return {
    remoteCall<T>(remoteId: string, eventName: string, args: any[], t: number = 5000) {
      return remoteCall<T>(id, remoteId, channel, eventName, args, t).toPromise();
    },
    initializeHandler<T extends any[], R>(handler: IPCRequestHandler<T, R>) {
      return initializeHandler(id, channel, handler);
    },
  };
}
