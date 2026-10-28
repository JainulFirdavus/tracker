const { contextBridge, ipcRenderer } = require('electron');

let shownDuration;
const listeners = new Set();
ipcRenderer.on('reminder:shown', (_event, duration) => {
  shownDuration = duration;
  for (const listener of listeners) listener(duration);
});

contextBridge.exposeInMainWorld('healthReminder', {
  dismiss: () => ipcRenderer.send('reminder:dismiss'),
  onShow: (callback) => {
    listeners.add(callback);
    if (shownDuration !== undefined) callback(shownDuration);
    return () => listeners.delete(callback);
  }
});
