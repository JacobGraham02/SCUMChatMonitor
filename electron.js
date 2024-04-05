import { app, BrowserWindow } from 'electron';

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
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
