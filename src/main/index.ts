import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import { dirname, join, sep } from 'path'
import type { ExportFile } from '../shared/api'

const PROJECT_FILTER = [{ name: 'Chrono Rig 2D project', extensions: ['sk2dproj'] }]

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#20242b',
    title: 'Chrono Rig 2D',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

ipcMain.handle('project:open', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: PROJECT_FILTER })
  if (res.canceled || res.filePaths.length === 0) return null
  const path = res.filePaths[0]
  return { path, text: await fs.readFile(path, 'utf8') }
})

ipcMain.handle('project:save', async (_e, text: string, path: string | null, suggestedName: string) => {
  let target = path
  if (!target) {
    const res = await dialog.showSaveDialog({ defaultPath: `${suggestedName}.sk2dproj`, filters: PROJECT_FILTER })
    if (res.canceled || !res.filePath) return null
    target = res.filePath
  }
  await fs.mkdir(dirname(target), { recursive: true })
  await fs.writeFile(target, text, 'utf8')
  return target
})

ipcMain.handle('export:bundle', async (_e, folderName: string, files: ExportFile[]) => {
  const res = await dialog.showOpenDialog({
    title: 'Choose where to create the export folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.canceled || res.filePaths.length === 0) return null
  const root = join(res.filePaths[0], folderName)
  for (const f of files) {
    const target = join(root, f.path)
    if (!target.startsWith(root + sep)) throw new Error(`Refusing to write outside export folder: ${f.path}`)
    await fs.mkdir(dirname(target), { recursive: true })
    if (f.base64 !== undefined) await fs.writeFile(target, Buffer.from(f.base64, 'base64'))
    else await fs.writeFile(target, f.text ?? '', 'utf8')
  }
  return root
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
