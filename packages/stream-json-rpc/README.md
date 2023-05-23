# stream-json-rpc
Easy bi-directionnal RPC for node/electron/browser, using the transport that you need.

## Usage
As the transport layer must implement the `stream.Duplex` interface, some helpers are already
available for [electron ipcMain/ipcRenderer](packages/stream-electron-ipc) and
[node-ipc](packages/stream-node-ipc).

### Example
##### Process 1
```typescript
import rpcchannel from 'stream-json-rpc';
import { getServer, NodeIpcServerDuplex, firstConnectionHandler } from 'stream-node-ipc';

// This process acts as a node-ipc server
// But it actually being a "server" is not really relevant,
// as any process can call any other process if they can directly communicate.

const ipcServer = getServer('my-namespace'); // Instance of NodeIPC.Server

// Whenever a new client is connected, the callback will be called with
// the Duplex stream already created
firstConnectionHandler(ipcServer, (duplex: NodeIpcServerDuplex) => {
  const channel = rpcchannel(duplex, {
    // defaultRequestTimeout?: number, // defaults: 2000 (ms)
    // forwardErrors?: boolean, // defaults: false (if true, errors during requests are fully forwarded to requester)
  });
  // Get a named connection
  // On the other side, the same call must be done, with the same id, to finish the handshake
  const peer = channel.peer('connection-id');
  
  // Register handlers
  peer.setRequestHandler('inc', ({ value }: any) => {
    return value + 1;
  });
});
```

##### Process 2
```typescript
import rpcchannel from 'stream-json-rpc';
import { getClient, NodeIpcClientDuplex } from 'stream-node-ipc';

// This process acts as node-ipc client

// Instance of NodeIPC.Client, connected to the server
const ipcClient = getClient('my-namespace');
const channel = rpcchannel(new NodeIpcClientDuplex(ipcClient));
// Get a named connection
// On the other side, the same call must be done, with the same id, to finish the handshake
const peer = channel.peer('connection-id');

// Call remote method on process 1
peer
  .request('inc', {
    value: 1,
  })
  .then((result) => {
    console.log('Result should be 2:', result);
  });

// You could also create any handler here with `addRequestHandler`
// or `addNotificationHandler`, and process1 would be able to call them.
```
