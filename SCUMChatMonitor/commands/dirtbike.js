const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('dirtbike')
            .setDescription('Spawns a dirt bike'),
        command_data: ['#SpawnVehicle BPC_Dirtbike'],
        authorization_role_name: [],
        command_cost: 30000,

        async execute(interaction) {

        }
    }
    return object;
}