import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('mimoAPI', {
    device: {
        info: () => ipcRenderer.invoke('device:info'),
        list: () => ipcRenderer.invoke('device:list'),
        sendMessage: (deviceId, message) => ipcRenderer.invoke('device:sendMessage', deviceId, message)
    },
    agent: {
        status: () => ipcRenderer.invoke('agent:status'),
        newChat: () => ipcRenderer.send('agent:new-chat'),
        clearHistory: () => ipcRenderer.send('agent:clear-history')
    },
    file: {
        openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
        read: (path) => ipcRenderer.invoke('file:read', path),
        write: (path, content) => ipcRenderer.invoke('file:write', path, content),
        listDir: (path) => ipcRenderer.invoke('file:listDir', path)
    },
    terminal: {
        execute: (command, cwd) => ipcRenderer.invoke('terminal:execute', command, cwd)
    },
    server: {
        url: () => ipcRenderer.invoke('server:url')
    },
    on: (channel, callback) => {
        const validChannels = [
            'device:discovered',
            'device:connected',
            'device:disconnected',
            'wake:notification',
            'project:opened',
            'open:settings',
            'agent:new-chat',
            'agent:clear-history',
            'file:new',
            'device:connect'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_, ...args) => callback(...args));
        }
    },
    off: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});
//# sourceMappingURL=index.js.map