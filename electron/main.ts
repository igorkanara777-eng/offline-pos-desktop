// electron/main.ts
import { app, BrowserWindow } from 'electron'
import * as path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // preload опционально, если используешь
      // preload: path.join(__dirname, 'preload.js'),
    },
  })

  const isDev = !app.isPackaged

  if (isDev) {
    // dev: Vite dev server
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // prod: грузим собранный index.html из соседней папки dist
    // После сборки main.js лежит в app.asar/electron/, а dist — рядом: ../dist/index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
