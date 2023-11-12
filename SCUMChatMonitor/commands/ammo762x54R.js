const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo762x54R')
            .setDescription('Spawns 3 boxes of 7.62x39 armour piercing ammo boxes'),
        command_data: ['#SpawnItem Cal_7_92x57mm_AP_Ammobox'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}