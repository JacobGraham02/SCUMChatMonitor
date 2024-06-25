import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function moveWindowToTopLeft(windowName) {
    const scriptPath = path.join(__dirname, 'windowControl.ps1');
    const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -windowName "${windowName}"`;

    exec(command, (error, stderr) => {
        if (error) {
            return;
        }
        if (stderr) {
            return;
        }
    });
}
