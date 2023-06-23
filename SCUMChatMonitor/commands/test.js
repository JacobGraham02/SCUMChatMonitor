const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('This is a test command only available for admins to use')
        .addStringOption(options =>
            options.setName('test_option')
                .setDescription('The description of test option')),
    command_data: 'This is a test message',
    authorization_role_name: ["Admin"],

    async execute(message) {
        
    }
}