const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('laikadriverseat')
            .setDescription('Spawns a laika driver seat'),
        command_data: [`#Location ${user_account.user_steam_id} true`, '#SpawnItem Laika_Seat_FrontLeft_Item'],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}