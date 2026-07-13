'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mspm0Desktop', Object.freeze({
  saveFile: payload => ipcRenderer.invoke('mspm0:save-file', payload)
}));
