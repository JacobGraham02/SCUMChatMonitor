import { SlashCommandBuilder } from 'discord.js'

export default function() {
    const generate_help_message_object = {
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription(`Use this command to list all available bot commands`),
        authorization_role_name: [],

        async execute(interaction) {
            const command_list = [
                "**Admin-specific commands:**",
                "**1. change-bot-username: Allows you to change the username of the bot**",
                "**Regular user commands:**",
                "**1. help: Shows a list of commands available to you for use with the bot**"
            ];

            try {
                await interaction.reply({content:`**Available commands:**\n${command_list.join('\n')}`, ephemeral: true});
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to list all available commands. Please try again or inform the server administrator of the following error: ${error}`});
            }
        }
    }
    return generate_help_message_object;
}