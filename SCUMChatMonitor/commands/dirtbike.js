const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('dirtbike')
            .setDescription('Spawns a dirt bike'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnVehicle BPC_Dirtbike', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 45000,

        async execute(interaction) {

        }
    }
    return object;
}