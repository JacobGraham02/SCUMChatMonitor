const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('discord')
            .setDescription('Generates a link for discord'),
        command_data: ['Discord: https://discord.gg/4BYPXWSFkv'],
        authorization_role_name: [],
        command_cost: 0,

        async execute(interaction) {
            await interaction.reply(`Discord: https://discord.gg/4BYPXWSFkv`)
        }
    }
    return object;
}