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

const duplex = new ElectronIpcRendererDuplex();
duplex.write(...); // writes to main process through ipc
duplex.on('data', (...) => {
  // Callback called when main process sends data through ipc
})
```
