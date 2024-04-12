import { app, BrowserWindow, ipcMain } from 'electron';
import WebSocket from 'ws';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';

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
    const websocket = new WebSocket(`ws://localhost:8080?websocket_id=${encodeURIComponent(websocket_id)}`);

    websocket.on('message', async (message) => {
        const json_message_data = JSON.parse(message);
        console.log(`Test message data: ${message.data}`);
        if (json_message_data.action === `runCommand` && json_message_data.package_items && json_message_data.guild_id) {
            try {
                await runCommand(json_message_data.package_items, websocket_id);
            } catch (error) {
               console.error(`There was an error when attempting to run a command: ${error}`);
            }
        }
        if (json_message_data.action === `reinitializeBot` && json_message_data.guild_id) {
            try {
                await reinitializeBotOnServer(json_message_data.guild_id, websocket_id);
            } catch (error) {
                console.error(`There was an error when attempting to reinitialize the bot on the SCUM server: ${error}`);
            }
        }
    });

    websocket.on('close', function() {
        
    });

    websocket.on('error', function() {

    });

    return websocket;
}

/**
 * An asynchronous function which pauses the execution of the application for a specified number of milliseconds. This is required when you are using Windows powershell
 * to prevent bottlenecks, slowdowns, or other abnormal system operations. 
 * In this instance, a promise is an operation that will prevent further execution of code. 
 * @param {number} milliseconds The total number of milliseconds to halt the application execution for.
 * @returns Returns a promise that will resolve itself after a certain number of milliseconds. 
 */
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * This function utilizes all of the above utility functions that interact with Windows via powershell. As mentioned, each time on of those functions are used, 
 * an 'await sleep()' blocker must be used for system stability. 
 * @param {string} command A string value containing the SCUM command to run in-game
 * @returns if the system cannot detect the SCUM process currently running, the function will cease execution. 
 */
async function runCommand(command, websocket_id) {
    await sleep(500);
    copyToClipboard(command, websocket_id);
    await sleep(500);
    pressCharacterKeyT(websocket_id);
    await sleep(500);
    pressBackspaceKey(websocket_id);
    await sleep(500);
    pasteFromClipboard(websocket_id);
    await sleep(500);
    pressEnterKey(websocket_id);
    await sleep(500);
}

/**
 * This is the sequence of operations which executes after the server restarts, and the bot must log back into the server.
 * The program detects if the server has restarted by checking for a specific TCP connection to the game server. Because the game server on SCUM has a static IP address and port,
 * we can use the Windows command 'netstat -an' to check for existing connections on the computer and see if our target IP address exists in the list. 
 * await sleep(N) is an asynchronous operation used to block any further processing of this function until after N milliseconds.
 * You can convert milliseconds to seconds by dividing N / 1000 (80000 milliseconds / 1000 milliseconds = 8 seconds).
 * The SCUM game interface has a 'continue' button to join the server you were last on, so this operation moves to there. 
 */
async function reinitializeBotOnServer(websocket_id) {
    await sendLogData (
        `InfoLogs`,
        `The scum bot monitor is offline. Attempting to log the bot back in to the server`,
        websocket_id,
        `${websocket_id}-info-logs`
    );
    await sleep(5000);
    moveMouseToPressOkForMessage(websocket_id);
    await sleep(100000);
    pressMouseLeftClickButton(websocket_id);
    await sleep(5000);
    moveMouseToContinueButtonXYLocation(websocket_id);
    await sleep(10000);
    pressMouseLeftClickButton(websocket_id);
    await sleep(20000);
    pressCharacterKeyT(websocket_id);
    await sleep(20000);
    pressTabKey(websocket_id);
    await sleep(5000);
    await sendLogData (
        `InfoLogs`,
        `The scum bot monitor has been activated and is ready to use`,
        websocket_id,
        `${websocket_id}-info-logs`
    )
    await sleep(5000);
    await enqueueCommand('Scum bot has been activated and is ready to use', guild_id);
}

/**
 * Executes a Windows powershell command to simulate a user moving the cursor to a specific (X, Y) location on screen. This is an asynchronous operation.
 */
async function moveMouseToContinueButtonXYLocation(websocket_id) {
    const x_cursor_position = 466;
    const y_cursor_position = 619;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `Error when moving the mouse to x 470 and y 550: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log('Moved mouse to continue button location');
    } catch (error) {
        console.error(`Failed to move mouse to continue button location`);
    }
}

/**
 * Executes a Windows powershell command to simulate a user moving the cursor to a specific (X, Y) location on screen. This is an asynchronous operation.
 */
async function moveMouseToPressOkForMessage(websocket_id) {
    const x_cursor_position = 958;
    const y_cursor_position = 536;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;
    
    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `Error when moving the mouse to x 958 and y 536: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Moved mouse to OK message popup`);
    } catch (error) {
        console.error(`Failed to move mouse to OK message popup`);
    }
}

/**
 * Executes a Windows powershell command to simulate a left mouse button click. This is as asynchronous operation.
 */
async function pressMouseLeftClickButton(websocket_id) {
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo); }'; $leftDown = 0x0002; $leftUp = 0x0004; [P]::mouse_event($leftDown, 0, 0, 0, 0); [P]::mouse_event($leftUp, 0, 0, 0, 0);"`;
    
    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `Error when left clicking the mouse: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Clicked the left mouse button`);
    } catch (error) {
        console.error(`Failed to click the left mouse button`);
    }
}

/**
 * Uses the Windows powershell command 'System.Windows.Forms.Clipboard]::SetText() to copy some text to the system clipboard
 * In the else clause, there is a debug log message if you want to uncomment that for development purposes
 * @param {string} text A string of text which will be copied to the system clipboard 
 */
async function copyToClipboard(text, websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('${text.replace(/'/g, "''")}')"`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when attempting to copy the bot text to the system clipboard: ${stderr}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Copied text to system clipboard operation successful`);
    } catch (error) {
        console.error(`Failed to copy text to the system clipboard: ${error}`);
    }
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('^v') to simulate a key press sequence that pastes text.
 * In this application specifically, this function pastes text into the active window, which is SCUM.exe. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
async function pasteFromClipboard(websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
 
    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when pasting contents from the clipboard: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Pasted text from system clipboard successfully`);
    } catch (error) {
        console.error(`Failed to paste text from system clipboard: ${error}`);
    }
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{TAB}') to simulate a tab key press on the active window. In this case, the active
 * window is SCUM.exe. The tab key switches channels between 'Local', 'Global', 'Admin', and 'Squad'. Currently, this function is not in use and is here for your convenience. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
async function pressTabKey(websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{TAB}')"`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when pressing the tab key: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Pressed the tab key`);
    } catch (error) {
        console.error(`Failed to press the tab key: ${error}`);
    }
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('t') to simulate a 't' character key press on the active window. 
 * In this case, the active window is SCUM.exe. The t character brings actives the in-game chat menu if it is not already active. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
async function pressCharacterKeyT(websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('t')`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when pressing the T character key: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Pressed the t character key`);
    } catch (error) {
        console.error(`Failed to press the t character key: ${error}`);
    }
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}') to simulate a backspace key press on the active window. 
 * In this case, the active window is SCUM.exe. The backspace key will execute immediately after pressCharacterT(), erasing the 't' character from chat if the chat window
 * is already active. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
async function pressBackspaceKey(websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when pressing the backspace key: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Pressed the backspace key`);
    } catch (error) {
        console.error(`Failed to press the backspace key: ${error}`);
    }
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{Enter}') to simulate an 'enter' character key press on the active window. 
 * In this case, the active window is SCUM.exe. The enter key sends a message in chat when pressed. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
async function pressEnterKey(websocket_id) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{Enter}')`;

    try {
        const { stdout, stderr } = await executeAsyncCommand(command);
        if (stderr) {
            await sendLogData(
                `ErrorLogs`,
                `There was an error when pressing the enter key: ${error}`,
                `${websocket_id}`,
                `${websocket_id}-error-logs`
            );
            return;
        }
        console.log(`Pressed the enter key`);
    } catch (error) {
        console.error(`Failed to press the enter key: ${error}`);
    }
}

function executeAsyncCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function sendLogData(log_type, message, guild_id, file_type) {
    try {
        const response = await fetch('http://localhost:8080/admin/logdata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                log_type,
                message,
                guild_id,
                file_type
            })
        });
        const response_data = await response.json();
        if (response_data.success) {
            console.log(`Log data send successfully: ${response_data.message}`);
        } else {
            console.error(`Failed to send log data: ${response_data.message}`);
        }
    } catch (error) {
        console.error(`There was an error when attempting to send new log file data: ${error}`);
    }
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
            const response = await fetch("http://localhost:8080/admin/createwebsocket", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const response_data = await response.json();
            return response_data;
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
