const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo762x39')
            .setDescription('Spawns 3x20 stacks of 30-06 armor piercing bullets'),
        command_data: ['#SpawnItem Cal_30 - 06_AP  3'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}