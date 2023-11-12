const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carjack')
            .setDescription('Spawns a car jack'),
        command_data: ['#SpawnItem Car_Jack'],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}