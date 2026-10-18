const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: ()             => ipcRenderer.invoke('dialog:open'),
  saveFile: (data, name)   => ipcRenderer.invoke('dialog:save', data, name),
  saveBinary: (bytes, name) => ipcRenderer.invoke('dialog:saveBinary', bytes, name),
  // Menu sync
  setLang:  (lang)         => ipcRenderer.send('menu:setlang', lang),
  // Receive menu actions (new, open, save, undo, redo)
  onMenuAction: (cb) => ipcRenderer.on('menu:action', (_, action) => cb(action)),
  // Force OS-level focus back to the window (fixes keyboard-input-lost bug
  // that can happen after native confirm()/alert() dialogs on Windows)
  refocus: () => ipcRenderer.send('win:refocus'),
})
