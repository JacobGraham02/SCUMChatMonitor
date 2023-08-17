const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('cooking')
            .setDescription('Spawns a bunch of ingredients for avid cooks'),
        command_data: [''],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}