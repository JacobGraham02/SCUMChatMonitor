const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagendriverseat')
            .setDescription('Spawns a front driver seat for wolkswagen car'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem WW_Seat_FrontLeft_Item', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}