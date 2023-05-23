import { EventEmitter } from 'events';
import { JsonRpcPayload, JsonRpcParamsSchema } from 'json-rpc-protocol';

export * from 'json-rpc-protocol';

export declare class Peer extends EventEmitter implements NodeJS.WritableStream {
  writable: boolean;

  constructor(onmessage?: (message: JsonRpcPayload, data: any) => Promise<any> | any);

  public exec(
    message: string | object,
    data?: any
  ): Promise<undefined | string | JsonRpcPayload | JsonRpcPayload[]>;

  /**
   * Fails all pending requests.
   */
  public failPendingRequests(reason?: string): void;

  /**
   * This function should be called to send a request to the other end.
   */
  public request(method: string, params?: JsonRpcParamsSchema): Promise<any>;

  /**
   * This function should be called to send a notification to the other end.
   */
  public notify(method: string, params?: JsonRpcParamsSchema): void;

  public push(chunk: any, encoding?: string): void;

  public pipe<T extends NodeJS.WritableStream>(writable: T): T;

  // NodeJS.WritableStream

  write(
    buffer: Uint8Array | string,
    cb?: (err?: Error | null) => void
  ): boolean;
  write(
    str: string,
    encoding?: string,
    cb?: (err?: Error | null) => void
  ): boolean;
  end(cb?: () => void): this;
  end(data: string | Uint8Array, cb?: () => void): this;
  end(str: string, encoding?: string, cb?: () => void): this;
}

export interface PeerInterface extends Peer {
  new(onmessage?: (message: JsonRpcPayload, data: any) => Promise<any> | any): PeerInterface;
}
