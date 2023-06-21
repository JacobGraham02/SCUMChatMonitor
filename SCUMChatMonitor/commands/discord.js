const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('discord')
        .setDescription('Generates a link for discord')
        .addStringOption(options =>
            options.setName('test_option')
                .setDescription('The description of test option')),
    command_data: 'Discord: https://discord.gg/4BYPXWSFkv',


    async execute(message) {

    }
}