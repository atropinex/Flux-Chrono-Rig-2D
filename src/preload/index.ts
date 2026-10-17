import { contextBridge, ipcRenderer } from 'electron'
import type { Sk2dApi } from '../shared/api'

const api: Sk2dApi = {
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (text, path, suggestedName) => ipcRenderer.invoke('project:save', text, path, suggestedName),
  exportBundle: (folderName, files) => ipcRenderer.invoke('export:bundle', folderName, files)
}

contextBridge.exposeInMainWorld('api', api)