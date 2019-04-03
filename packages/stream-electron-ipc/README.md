# stream-electron-ipc
`electron.ipcMain` and `electron.ipcRenderer` as Duplex streams

## Usage
### main
```typescript
import { ElectronIpcMainDuplex } from 'stream-electron-ipc';

...
const duplex = new ElectronIpcMainDuplex(someWebContents);
duplex.write(...); // writes to underlying webContents through ipc
duplex.on('data', (...) => {
  // Callback called when underlying webContents sends data through ipc
})
```

### renderer
```typescript
import { ElectronIpcRendererDuplex } from 'stream-electron-ipc';

// Connect to main process
const duplex = new ElectronIpcRendererDuplex(); // equivalent to `new ElectronIpcRendererDuplex(0);`
duplex.write(...); // writes to main process through ipc
duplex.on('data', (...) => {
  // Callback called when main process sends data through this duplex
})

// Connect to another renderer
const duplex = new ElectronIpcRendererDuplex(rendererWebContentsId);
duplex.write(...); // writes to the renderer process through ipc
duplex.on('data', (...) => {
  // Callback called when renderer process sends data through this duplex
})
```
