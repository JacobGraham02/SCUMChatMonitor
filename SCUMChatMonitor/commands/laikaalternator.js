const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('laikaalternator')
            .setDescription('Spawns a laika alternator'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Laika_Engine_Alternator_Item', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 3500,

        async execute(interaction) {

        }
    }
    return object;
}