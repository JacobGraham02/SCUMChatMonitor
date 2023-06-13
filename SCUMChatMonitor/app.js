'use strict';

const { exec } = require('child_process');
const { discord_bot_token, discord_public_key, discord_secret_key, discord_client_id, discord_guild_id, discord_channel_id } = require('./config.json');
const { Client, GatewayIntentBits } = require('discord.js');
const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers]
});
const message_regex_pattern = new RegExp("(!discord|\/discord|#discord|!join discord|\/join discord)");
const message_contains_discord_regex_pattern = new RegExp("Discord: https://discord.gg/4BYPXWSFkv");
const scum_discord_invite_message = 'Discord: https://discord.gg/4BYPXWSFkv';
const channel_name = 'chat-scum';

client_instance.on('ready', () => {
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

client_instance.on('messageCreate', async (message) => {
    const message_content = message.content;

    if (message.channel.name === channel_name && message_regex_pattern.test(message_content)) {

        if (!message_contains_discord_regex_pattern.test(message_content)) {
            type_in_global_chat(scum_discord_invite_message);
        }
    }
});

client_instance.login(discord_bot_token);


function copyToClipboard(text) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('${text.replace(/'/g, "''")}')"`
    exec(command, (error) => {
        if (error) {
            console.error('Error copying to clipboard:', error);
        } else {
            console.log('Text copied to clipboard.');
        }
    });
}

function pasteFromClipboard() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
    exec(command, (error) => {
        if (error) {
            console.error('Error pasting from clipboard:', error);
        } else {
            console.log('Text pasted from clipboard.');
        }
    });
}

function pressEnterKey() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{Enter}')`;
    exec(command, (error) => {
        if (error) {
            console.error('Error simulating enter key press:', error);
        } else {
            console.log('Enter key press simulated');
        }
    });
}

async function runCommand(command) {
    copyToClipboard(command);
    const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"');
    if (!scumProcess) {
        return;
    }

    await sleep(500);
    pasteFromClipboard();
    await sleep(250);
    pressEnterKey();
}
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
    
function type_in_global_chat(content) {
    console.log(`Global chat announcement ${content}`);
    runCommand(`${content}`);
}


/*function checkIfScumGameRunning(callback) {
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
}, 20000); // Execute every 20 seconds
*/