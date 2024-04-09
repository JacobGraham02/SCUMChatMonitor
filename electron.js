import { randomUUID } from 'crypto';
import { app, BrowserWindow, ipcMain } from 'electron';
import WebSocket from 'ws';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

let mainWindow;

function createWindow() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // const websocket = createWebSocketConnection();

    // websocket.on('message', function(message) {
    //     console.log(`Received message from server`);
    //     console.log(message);
    // });

    // Load the index page of your app from your Express server.
    mainWindow.loadURL('http://localhost:8080');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

async function createWebSocketConnection(websocket_id) {
    const ws = new WebSocket(`ws://localhost:8080?websocket_id=${encodeURIComponent(websocket_id)}`);

    ws.on('open', () => {
        ws.send('Hello from client!');
    });

    ws.on('message', (event) => {
        console.log('Message from server:', event.data);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });

    return ws;
}

app.whenReady().then(() => {
    ipcMain.handle('loginWebsocket', async (event, { login_response }) => {
        await createWebSocketConnection(login_response.bot_id);
    });
    createWindow();
    app.on('active', function() {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.whenReady().then(() => {
    ipcMain.handle('checkUserLogin', async (event, { email, password }) => {
        try {
            const response = await fetch("http://localhost:8080/admin/login", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const response_data = await response.json();
            return response_data.success;
        } catch (error) {
            console.error(`Error during login: ${error}`);
            return false; 
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function() {
    console.log(`Electron window was opened`);
});

export default app;
