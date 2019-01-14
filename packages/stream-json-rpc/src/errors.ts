import { JsonRpcError } from 'json-rpc-protocol';

export const wrapError = (e: JsonRpcError) => {
  if (e.data && (e.data as any).stack) {
    e.stack = `${e.stack}
Caused by: ${(e.data as any).stack}`;
    delete (e.data as any).stack;
  }
  return e;
};
