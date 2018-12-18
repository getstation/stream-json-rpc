# stream-node-ipc
`node-ipc` as Duplex streams

## Usage
### server
```typescript
import { getServer, NodeIpcServerDuplex } from 'stream-node-ipc';

// first parameter here is node-ipc `appspace` parameter
const ipcClient = getServer('magne4000-test-worker');

const newClientConnection = (_data: Buffer, socket: Socket) => {
  // Direct bi-directionnal connection between a client (socket) and this server
  // using node-ipc
  const duplex = new NodeIpcServerDuplex(ipcClient, socket);
  duplex.write(...); // writes to the client via node-ipc
  duplex.on('data', (...) => {
    // Callback called when the client sends data via node-ipc
  })
};

// catch first connection for each client in some way
ipcClient.on('data', newClientConnection);
```

### client
```typescript
import { getClient, NodeIpcClientDuplex } from 'stream-node-ipc';

// first parameter here is node-ipc `appspace` parameter
const ipcClient = getClient('magne4000-test-worker');

const duplex = new NodeIpcClientDuplex(ipcClient);
duplex.write(...); // writes to the server via node-ipc
duplex.on('data', (...) => {
  // Callback called when the server sends data via node-ipc
})
```
