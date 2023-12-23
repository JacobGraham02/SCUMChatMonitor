require('dotenv').config({path:'.env'});
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [];
const commands_path = path.join(__dirname, 'commands');
const commands_files = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

for (const command_file of commands_files) {
    const command_file_path = path.join(commands_path, command_file);
    const command = require(command_file_path);
    const command_object = command('test');
    commands.push(command_object.data);
}

const rest = new REST({ version: '9' }).setToken(process.env.discord_wilson_bot_token);

rest.put(Routes.applicationGuildCommands(process.env.discord_wilson_bot_client_id, process.env.discord_wilson_bot_guild_id), { body: commands })
    .then(() => { console.log('Successfully registered application commands') })
    .catch((error) => {
        console.error(error);
    });