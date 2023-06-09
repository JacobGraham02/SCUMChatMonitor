'use strict';

const { exec } = require('child_process');
const { discord_bot_token, discord_public_key, discord_secret_key, discord_client_id, discord_guild_id, discord_channel_id } = require('./config.json');
const robot = require('robotjs');
const { Client, GatewayIntentBits } = require('discord.js');
const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers]
});
const message_regex_pattern = new RegExp("(!discord|discord|\/discord|#discord|join discord|!join discord|\/join discord)");
const channel_name = 'chat-scum';

client_instance.on('ready', () => {
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

client_instance.on('messageCreate', async (message) => {
    const message_content = message.content;

    if (message.channel.name === channel_name && message_regex_pattern.test(message_content)) {

        // message.channel.send('Discord: https://discord.gg/VseKPc8r');
        type_in_global_chat('Discord: https://discord.gg/VseKPc8r');
    }
});

client_instance.login(discord_bot_token);

async function runCommand(command) {
    const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"');
    if (!scumProcess) {
        return;
    }

    await sleep(1000);
    robot.keyTap('tab');
    robot.typeString(command);
    robot.keyTap('enter');
        /*const powershell = spawn('powershell.exe', ['-NoExit']);

        powershell.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        powershell.stderr.on('data', (data) => {
            console.error(data.toString());
        });
        powershell.stdin.write(`Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class User32 { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'\n`);
        powershell.stdin.write(`[System.Windows.Forms.SendKeys]::SendWait('t')\n`);
        powershell.stdin.write(`Start-Sleep -Milliseconds 300\n`);
        powershell.stdin.write(`[System.Windows.Forms.Clipboard]::SetText('${command}')\n`);
        powershell.stdin.write(`[System.Windows.Forms.SendKeys]::SendWait('^v')\n`);
        powershell.stdin.write(`[System.Windows.Forms.SendKeys]::SendWait('{Enter}{Escape}')\n`);
        powershell.stdin.end();*/
}
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function type_in_global_chat(content) {
    console.log(`Global chat announcement ${content}`);
    runCommand(`${content}`);
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
            console.log("The SCUM game is running, and the process can be detected");
        } else {
            console.log("The SCUM game is either not running, or the process can be detected");
        }
    });
}, 20000); // Execute every 20 seconds*/