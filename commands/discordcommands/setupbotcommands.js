import { Collection, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
config({ path: '.env' });

const bot_token = process.env.bot_token;

export default function() {
    const setup_bot_commands = {
        data: new SlashCommandBuilder()
            .setName('setupbotcommands')
            .setDescription(`Enable commands to customize your bot`)
            ,
        authorization_role_name: ["Bot administrator"],

        async execute(interaction) {
            try {
                const bot_client = interaction.client;
                const bot_client_id = bot_client.user.id;
                await registerInitialSetupCommands(bot_token, bot_client_id, interaction.guild.id);
                await interaction.reply({content:`The commands have been successfully registered with the bot!`,ephemeral:true});
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show the user setup modal: ${error}`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the user setup modal: ${error}`);
            }
        }
    }
    return setup_bot_commands;
}

async function registerInitialSetupCommands(bot_token, bot_id, guild_id) {
    const commands_folder_path = path.join(__dirname, "./commands/discordcommands");
    const filtered_command_files = fs
        .readdirSync(commands_folder_path)
        .filter((file) => file !== "deploy-commands.js");
    client_instance.discord_commands = new Collection();

    const commands = [];

    const initial_bot_commands = [`setupuser`, `setupchannels`, `setupgameserver`, `setupchannels`, `setupftpserver`];

    for (const command_file of filtered_command_files) {
        const command_file_path = path.join(commands_folder_path, command_file);
        const command_file_url = pathToFileURL(command_file_path).href;
        const command_import = await import(command_file_url);
        const command_default_object = command_import.default();

        if (initial_bot_commands.includes(command_default_object.data.name)) {
            commands.push(command_default_object.data);
            client_instance.discord_commands.set(command_default_object.data.name, command_default_object);
        }
    }

    if (bot_token && bot_id && guild_id) {
        const rest = new REST({ version: '10' }).setToken(bot_token)
        
        rest.put(Routes.applicationGuildCommands(bot_id, guild_id), {
            body: commands
        }).then(() => {
            message_logger.writeLogToAzureContainer(
                `InfoLogs`,
                `Successfully initialized the application seutp commands for ${bot_id} in the guild ${guild_id}`,
                guild_id,
                `${guild_id}-error-logs`
            )
        }).catch((error) => {
            message_logger.writeLogToAzureContainer(
                `ErrorLogs`,
                `There was an error when attempting to register the initial application commands for ${bot_id} in the guild ${guild_id}: ${error}`,
                guild_id,
                `${guild_id}-error-logs`
            )
        });
    }
}