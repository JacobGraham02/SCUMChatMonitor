const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagendriverseat')
            .setDescription('Spawns a front driver seat for wolkswagen car'),
        command_data: ['#SpawnItem WW_Seat_FrontLeft_Item'],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}