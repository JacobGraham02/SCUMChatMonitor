'use strict';

const { exec } = require('child_process');

class ScumManager {

    static runCommand(command) {
        const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"')
        if (!scumProcess) {
            return;
        }

        exec('powershell.exe -c "[System.Windows.Forms.SendKeys]::SendWait(\'t\')"');
        setTimeout(() => {
            exec(`powershell.exe -c "[System.Windows.Forms.Clipboard]::SetText('${command}');"`);

            exec('powershell.exe -c "[System.Windows.Forms.SendKeys]::SendWait(\'^v\')"');
            exec('powershell.exe -c "[System.Windows.Forms.SendKeys]::SendWait(\'{Enter}{Escape}\')"');
        }, 300);
        }
    }

    function checkIfScumGameRunning(callback) {
    const processName = 'SCUM';

    const command = `tasklist /FI "IMAGENAME eq ${processName}.exe"`;

    exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`Error executing command: ${error || stderr}`);
            callback(false);
            return;
        }

        const output = stdout.toLowerCase();

        // Check if the process name exists in the output
        const isRunning = output.includes(processName.toLowerCase());

        callback(isRunning);
    });
}

setInterval(() => {
    checkIfScumGameRunning((isRunning) => {
        if (isRunning) {
            // Example usage
            ScumManager.teleport('123', '1', '2', '3');
            ScumManager.teleportTo('456', '789');
            ScumManager.spawnItem('sword', 1);
            ScumManager.spawnItem('shield', 2, 'location');
            ScumManager.announce('Hello, world!');
            ScumManager.dumpAllSquadsInfoList();
        }
    });
}, 5000); // Execute every 5 seconds