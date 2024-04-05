import { app, BrowserWindow } from 'electron';
import path from 'path';
import expressServer from './app.js'; // Import your Express app

let mainWindow;

function createWindow() {
    // Start your Express server
    const server = expressServer.listen(8080, () => {
        console.log('Express server listening on port 8080');
    });

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Load the index page of your app.
    mainWindow.loadURL('http://localhost:8080');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
        server.close(); // Stop the Express server when the window is closed
    });
}

// Electron 'app' lifecycle events
app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
