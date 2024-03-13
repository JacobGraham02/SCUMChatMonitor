require('dotenv').config({path:'../.env'});
import fs from 'fs';
import path from 'path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';

const discord_token = process.env.discord_wilson_bot_token;
const discord_client_id = process.env.discord_wilson_bot_client_id;
const discord_guild_id = process.env.discord_wilson_bot_guild_id;
const commands = [];
const commands_folder_path = __dirname;
const commands_files = fs.readdirSync(commands_folder_path);
const filtered_commands_files = commands_files.filter(file => file !== 'deploy-commands.js');

async function registerCommands() {
    for(const command_file of filtered_commands_files) {
        const command_file_path = path.join(commands_folder_path, command_file);
        const command = await import(command_file_path);
        const command_object = command.default();
        commands.push(command_object.data);
    }
}

registerCommands().then(() => {
    if (discord_token) {
        const rest = new REST({version:'9'}).setToken(discord_token);

        if (discord_client_id && discord_guild_id) {
            rest.put(Routes.applicationGuildCommands(discord_client_id, discord_guild_id), {
                body:commands
            }).then(() => {
                console.log('The application commands were successfully registered');
            }).catch((error) => {
                console.error(`The application encountered an error when registering the commands with the discord bot. All environment variables were valid. ${error}`);
            });
        } else {
            console.error(`The discord client id or guild id was invalid when trying to register commands with the bot`);
        }
    } else {
        console.error(`The discord bot token was invalid when trying to register commands with the bot: ${discord_token}`);
    }
});