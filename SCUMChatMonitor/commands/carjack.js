const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carjack')
            .setDescription('Spawns a car jack'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Car_Jack', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2500,

        async execute(interaction) {

        }
    }
    return object;
}