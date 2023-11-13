const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carbattery')
            .setDescription('Spawns a car battery'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Car_Battery', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}