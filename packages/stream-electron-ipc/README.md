# stream-electron-ipc
`electron.ipcMain` and `electron.ipcRenderer` as Duplex streams

## Usage
### main
```typescript
import { ElectronIpcMainDuplex } from 'stream-electron-ipc';

...
const someWebContents: Electron.WebContents = ...;
const channel = 'my-custom-channel';
const duplex = new ElectronIpcMainDuplex(someWebContents, channel);
duplex.write(...); // writes to underlying webContents through ipc
duplex.on('data', (...) => {
  // Callback called when underlying webContents sends data through ipc
})
```

### renderer
```typescript
import { ElectronIpcRendererDuplex } from 'stream-electron-ipc';

// Connect to main process
const someWebContentsId = 0; // 0 is always the main process
const channel = 'my-custom-channel'; // Same channel as in other process
const duplex = new ElectronIpcRendererDuplex(someWebContentsId, channel);
duplex.write(...); // writes to main process through ipc
duplex.on('data', (...) => {
  // Callback called when main process sends data through this duplex
})

// Connect to another renderer
const someWebContentsId = 12;
const channel = 'my-custom-channel'; // Same channel as in other process
const duplex = new ElectronIpcRendererDuplex(someWebContentsId, channel);
duplex.write(...); // writes to the renderer process through ipc
duplex.on('data', (...) => {
  // Callback called when renderer process sends data through this duplex
})
```
