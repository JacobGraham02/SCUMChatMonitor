const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('laikawheel')
            .setDescription('Spawns a laika wheel'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Wheel_255_55_R16_Item'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}