const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    checkLoginCredentials: async (email, password) => {
        const check_credentials_response = await ipcRenderer.invoke('checkUserLogin', { email, password });
        return check_credentials_response;
    },
    createLoginWebsocket: (login_response) => ipcRenderer.invoke('loginWebsocket', { login_response })
});