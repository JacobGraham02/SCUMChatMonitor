const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('sewingkit')
            .setDescription('Spawns a sewing kit'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Sewing_kit', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 1000,

        async execute(interaction) {

        }
    }
    return object;
}