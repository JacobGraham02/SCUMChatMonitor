const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo30x06')
            .setDescription('Spawns 3x20 stacks of 30-06 armor piercing bullets'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Cal_30-06_AP 3', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}