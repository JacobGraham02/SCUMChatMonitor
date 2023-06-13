const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('This is a test command')
        .addStringOption(options =>
            options.setName('test_option')
                .setDescription('The description of test option')),
    authorization_role_name: ["Admin"],
    command_data: 'This is a test message',

    async execute(message) {
        
    }
}