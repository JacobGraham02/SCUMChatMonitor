import { app, BrowserWindow, ipcMain } from 'electron';
import WebSocket from 'ws';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const websocket = createWebSocketConnection();

    websocket.on('message', function(message) {
        console.log(`Received message from server`);
        console.log(message);
    });

    // Load the index page of your app from your Express server.
    mainWindow.loadURL('http://localhost:8080');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function createWebSocketConnection() {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        ws.send('Hello from client!');
    };
    ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
    };
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };
    return ws;
}

ipcMain.on('websocketdata', function(event, data) {
    mainWindow.webContents.send('websocketdata', data);
});

// Electron 'app' lifecycle events
app.on('ready', function() {
    createWindow();
    console.log(`Electron is ready`);
});


app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function() {
    console.log(`Electron window was opened`);
});

export default app;
