
    const { SlashCommandBuilder } = require('@discordjs/builders');
    
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('pvpzones')
            .setDescription('This is a sample command that will show pvp zones'),
        command_data: [`The pvp zones on this server are the areas in red. They include the large red circle on the North and South of the map.`],
        authorization_role_name: ['Admin'],
        command_cost: 0,

        async execute(interaction) {
            await interaction.reply('This is the test pvp zones');
        }
    }
    return object;
}