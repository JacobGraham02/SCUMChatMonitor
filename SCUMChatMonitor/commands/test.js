
    const { SlashCommandBuilder } = require('@discordjs/builders');
    
module.exports = {
    data: new SlashCommandBuilder()
         .setName('test')
         .setDescription('test'),
    command_data: 'test',
    authorization_role_name: ['test'],

    async execute(interaction) {
        await interaction.reply('This is the test message');
    }
}