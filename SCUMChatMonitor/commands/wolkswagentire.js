const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagenwheel')
            .setDescription('Spawns a wolks wagen wheel'),
        command_data: [`#Location ${user_account.user_steam_id} true`, '#SpawnItem Wheel_155_R65_Item'],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}