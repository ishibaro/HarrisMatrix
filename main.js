const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')

// Required when running as root on Linux / Docker
app.commandLine.appendSwitch('no-sandbox')

let mainWindow = null
let currentLang = 'es'   // kept in sync with renderer via IPC

// ── Menu labels (ES / EN) ─────────────────────────────────
const L = {
  es: {
    file:'Archivo', new:'Nuevo proyecto', save:'Guardar proyecto',
    open:'Abrir proyecto…', quit:'Salir',
    view:'Ver', reload:'Recargar', devtools:'Herramientas de desarrollo',
    zoomNormal:'Zoom normal', zoomIn:'Acercar', zoomOut:'Alejar',
    fullscreen:'Pantalla completa',
    edit:'Editar', undo:'Deshacer', redo:'Rehacer',
    cut:'Cortar', copy:'Copiar', paste:'Pegar', selectAll:'Seleccionar todo',
  },
  en: {
    file:'File', new:'New project', save:'Save project',
    open:'Open project…', quit:'Quit',
    view:'View', reload:'Reload', devtools:'Developer tools',
    zoomNormal:'Actual size', zoomIn:'Zoom in', zoomOut:'Zoom out',
    fullscreen:'Toggle fullscreen',
    edit:'Edit', undo:'Undo', redo:'Redo',
    cut:'Cut', copy:'Copy', paste:'Paste', selectAll:'Select all',
  }
}

function buildMenu() {
  const lbl  = L[currentLang] || L.es
  const isMac = process.platform === 'darwin'
  const send  = (action) => {
    if (!mainWindow) return
    mainWindow.focus()
    mainWindow.webContents.focus()
    mainWindow.webContents.send('menu:action', action)
  }

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role:'about' }, { type:'separator' }, { role:'services' },
        { type:'separator' }, { role:'hide' }, { role:'hideOthers' },
        { role:'unhide' }, { type:'separator' }, { role:'quit' },
      ]
    }] : []),
    {
      label: lbl.file,
      submenu: [
        { label: lbl.new,  accelerator: 'CmdOrCtrl+N', click: () => send('new')  },
        { label: lbl.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: lbl.open, accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        isMac ? { role:'close' } : { label: lbl.quit, role:'quit' },
      ]
    },
    {
      label: lbl.view,
      submenu: [
        { label: lbl.reload,      role: 'reload'           },
        { label: lbl.devtools,    role: 'toggleDevTools'   },
        { type: 'separator' },
        { label: lbl.zoomNormal,  role: 'resetZoom'        },
        { label: lbl.zoomIn,      role: 'zoomIn'           },
        { label: lbl.zoomOut,     role: 'zoomOut'          },
        { type: 'separator' },
        { label: lbl.fullscreen,  role: 'togglefullscreen' },
      ]
    },
    {
      label: lbl.edit,
      submenu: [
        { label: lbl.undo,      accelerator: 'CmdOrCtrl+Z',       click: () => send('undo') },
        { label: lbl.redo,      accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('redo') },
        { type: 'separator' },
        { label: lbl.cut,       role: 'cut'       },
        { label: lbl.copy,      role: 'copy'      },
        { label: lbl.paste,     role: 'paste'     },
        { label: lbl.selectAll, role: 'selectAll' },
      ]
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── Window ────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 640, minHeight: 500,
    title: 'Matriz de Harris',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools()
}

// ── IPC handlers ──────────────────────────────────────────
ipcMain.handle('dialog:open', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Harris Matrix', extensions: ['harris', 'json'] },
      { name: 'All Files',     extensions: ['*'] },
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return fs.readFileSync(result.filePaths[0], 'utf8')
})

ipcMain.handle('dialog:save', async (_, data, defaultName) => {
  if (!mainWindow) return false
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Harris Matrix', extensions: ['harris', 'json'] },
      { name: 'All Files',     extensions: ['*'] },
    ]
  })
  if (result.canceled || !result.filePath) return false
  fs.writeFileSync(result.filePath, data, 'utf8')
  return true
})

ipcMain.handle('dialog:saveBinary', async (_, bytes, defaultName) => {
  if (!mainWindow) return false
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'GeoPackage', extensions: ['gpkg'] },
      { name: 'All Files',  extensions: ['*'] },
    ]
  })
  if (result.canceled || !result.filePath) return false
  fs.writeFileSync(result.filePath, Buffer.from(bytes))
  return true
})

ipcMain.on('menu:setlang', (_, lang) => {
  currentLang = lang
  buildMenu()
})

// Forces a real OS-level blur+focus cycle. Needed because after a native
// dialog (confirm/alert) closes, Chromium sometimes stops routing keyboard
// input to the page even though the window looks focused.
ipcMain.on('win:refocus', () => {
  if (!mainWindow) return
  mainWindow.blur()
  mainWindow.focus()
  mainWindow.webContents.focus()
})

// ── Lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu()
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
