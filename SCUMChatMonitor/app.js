'use strict';

const { exec } = require('child_process');
const path = require('node:path');
const fs = require('node:fs');
const { discord_bot_token, discord_public_key, discord_secret_key, discord_client_id, discord_guild_id, discord_channel_id } = require('./config.json');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers]
});
const message_regex_pattern = new RegExp("(!discord|\/discord|#discord|!join discord|\/join discord)");
const message_content_command_regex = new RegExp("([a-zA-Z]+)");
const message_contains_discord_regex_pattern = new RegExp("Discord: https://discord.gg/4BYPXWSFkv");
const scum_discord_invite_message = 'Discord: https://discord.gg/4BYPXWSFkv';
const channel_name = 'chat-scum';

const commands_path = path.join(__dirname, 'commands');
const command_files_list = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

client_instance.commands = new Collection();

for (const command_file of command_files_list) {
    const command_file_path = path.join(commands_path, command_file);
    const command = require(command_file_path);
    client_instance.commands.set(command.data.name, command);
}

client_instance.on('ready', () => {
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

client_instance.on('messageCreate', async (message) => {
    const message_content = message.content;
    const message_content_command_array = message_content.match(message_content_command_regex);
    const message_content_command = message_content_command_array[0].trim();
    const client_command_values = client_instance.commands.get(message_content_command);

    if (determineIfUserMessageInCorrectChannel(message) && determineIfUserMessageMatchesRegex(message_content) && determineIfUserCanUseCommand(message.member, client_command_values)) {
        // type_in_global_chat(scum_discord_invite_message);
        const client_command_message = client_command_values.command_data;
        console.log(client_command_message);

    }
    // message.channel.name === channel_name && message_regex_pattern.test(message_content)) {

    // If the message sent in the discord channel 'chat-scum' matches the regex pattern for the discord invite link, do not send the discord invite link. 
    /*if (!message_contains_discord_regex_pattern.test(message_content)) {
        type_in_global_chat(scum_discord_invite_message);
    }*/
}
);

client_instance.login(discord_bot_token);

function determineIfUserCanUseCommand(message_sender, client_command_values) {
    if (client_command_values.authorization_role_name === undefined) {
        return true;
    }
    return message_sender.roles.cache.some(role => client_command_values.authorization_role_name.includes(role.name));
}

function determineIfUserMessageMatchesRegex(user_message) {
    return message_content_command_regex.test(user_message);
}

function determineIfUserMessageInCorrectChannel(user_message) {
    return user_message.channel.name === channel_name;
}

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