# stream-json-rpc
Call remote process methods easily, using the transport that you need.

## Usage
Example using node-ipc
```typescript
// The transport layer must implement the `stream.Duplex` interface
// Here are the ones for `node-ipc`
import { Duplex } from 'stream';

class ServerDuplex extends Duplex {
  ipc: NodeIPC.Server; // instance of nodeipc.server
  socket: NodeIPC.Socket; // destination socket

  constructor(ipc: NodeIPC.Server, socket: NodeIPC.Socket) {
    super();
    this.ipc = ipc;
    this.socket = socket;

    ipc.on('data', data => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.ipc.emit(this.socket, chunk);
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}

class ClientDuplex extends Duplex {
  ipc: NodeIPC.Client; // ipc socket opened between current process and the server

  constructor(ipc: NodeIPC.Client) {
    super();
    this.ipc = ipc;

    ipc.on('data', data => {
      this.push(data);
    });
  }

  // tslint:disable-next-line
  _write(chunk: any, _encoding: any, callback: any) {
    this.ipc.emit(chunk);
    callback();
  }

  // tslint:disable-next-line
  _read(_size: any) {}
}
```

And the actual implementation would look like:
##### Process 1
```typescript
import rpcchannel from 'stream-json-rpc';

// This process acts as node-ipc server
// But it actually being a "server" is not really relevant,
// as any process can call any other process if they can directly communicate.

const ipc = getIPC(); // Instance of NodeIPC.Server
const sockets = new Map(); // List of clients

// At first connection, store the client socket
const firstConnection = (data: Buffer, socket: any) => {
  const id = data.toString();
  sockets.set(id, socket);
  const channel = rpcchannel(new ServerDuplex(ipc, socket)); // Create the channel on the server side
  const peer = channel.peer();
  
  // Register handlers
  peer.setRequestHandler('inc', ({ value }: any) => {
    return value + 1;
  });
  
  ipc.off('data', firstConnection);
};
ipc.on('data', firstConnection);
```

##### Process 2
```typescript
import rpcchannel from 'stream-json-rpc';

// This process acts as node-ipc client

// Instance of NodeIPC.Client, connected to the server
// Also, getIPC here should send a first message with its id to the server.
// That way the server can finish initializing the connection with this process.
// (i.e. call `channel.setLink` on his side)
const ipcClient = getIPC();
const channel = rpcchannel(new TestDuplex(ipcClient));
const peer = channel.peer();

// Call remote method on process 1
peer
  .request('inc', {
    value: 1,
  })
  .then((result) => {
    console.log('Result should be 2:', result);
  });

// You could also create any handler here with `addRequestHandler`
// or `addNotificationHandler`, and process1 would be abvle to call them.
```
