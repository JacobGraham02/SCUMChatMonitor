// import { config } from 'dotenv';
// config({ path: '.env' });
// import fs from 'fs';
// import path from 'path';
// import { REST } from '@discordjs/rest';
// import { Routes } from 'discord.js';

// const discord_token = process.env.discord_wilson_bot_token;
// const discord_client_id = process.env.discord_wilson_bot_client_id;
// const discord_guild_id = process.env.discord_wilson_bot_guild_id;
// const commands = [];
// const commands_folder_path = __dirname;
// const commands_files = fs.readdirSync(commands_folder_path);
// const filtered_commands_files = commands_files.filter(file => file !== 'deploy-commands.js');

// async function registerInitialSetupCommands(bot_token, bot_id, guild_id) {
//     const commands_folder_path = path.join(__dirname, "./commands/discordcommands");
//     const filtered_command_files = fs
//         .readdirSync(commands_folder_path)
//         .filter((file) => file !== "deploy-commands.js");
//     client_instance.discord_commands = new Collection();

//     const commands = [];

//     const initial_bot_commands = [`setupuser`, `setupchannels`, `setupgameserver`, `setupchannels`, `setupftpserver`];

//     for (const command_file of filtered_command_files) {
//         const command_file_path = path.join(commands_folder_path, command_file);
//         const command_file_url = pathToFileURL(command_file_path).href;
//         const command_import = await import(command_file_url);
//         const command_default_object = command_import.default();

//         if (initial_bot_commands.includes(command_default_object.data.name)) {
//             commands.push(command_default_object.data);
//             client_instance.discord_commands.set(command_default_object.data.name, command_default_object);
//         }
//     }

//     if (bot_token && bot_id && guild_id) {
//         const rest = new REST({ version: '10' }).setToken(bot_token)
        
//         rest.put(Routes.applicationGuildCommands(bot_id, guild_id), {
//             body: commands
//         }).then(() => {
//             message_logger.writeLogToAzureContainer(
//                 `InfoLogs`,
//                 `Successfully initialized the application seutp commands for ${bot_id} in the guild ${guild_id}`,
//                 guild_id,
//                 `${guild_id}-error-logs`
//             )
//         }).catch((error) => {
//             message_logger.writeLogToAzureContainer(
//                 `ErrorLogs`,
//                 `There was an error when attempting to register the initial application commands for ${bot_id} in the guild ${guild_id}: ${error}`,
//                 guild_id,
//                 `${guild_id}-error-logs`
//             )
//         });
//     }
// }

    // async function registerCommands() {
    //     for(const command_file of filtered_commands_files) {
    //         const command_file_path = path.join(commands_folder_path, command_file);
    //         const command = await import(command_file_path);
    //         const command_object = command.default();
    //         commands.push(command_object.data);
    //     }
    // }
    
    // registerCommands().then(() => {
    //     if (discord_token) {
    //         const rest = new REST({version:'9'}).setToken(discord_token);
    
    //         if (discord_client_id && discord_guild_id) {
    //             rest.put(Routes.applicationGuildCommands(discord_client_id, discord_guild_id), {
    //                 body:commands
    //             }).then(() => {
    //                 console.log('The application commands were successfully registered');
    //             }).catch((error) => {
    //                 console.error(`The application encountered an error when registering the commands with the discord bot. All environment variables were valid. ${error}`);
    //             });
    //         } else {
    //             console.error(`The discord client id or guild id was invalid when trying to register commands with the bot`);
    //         }
    //     } else {
    //         console.error(`The discord bot token was invalid when trying to register commands with the bot: ${discord_token}`);
    //     }
    // });
    