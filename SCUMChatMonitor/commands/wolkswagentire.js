const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagentire')
            .setDescription('Spawns a wolks wagen wheel'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Wheel_155_R65_Item', `#TeleportTo 0`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}