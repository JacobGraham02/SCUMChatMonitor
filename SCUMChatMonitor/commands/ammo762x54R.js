const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo762x54r')
            .setDescription('Spawns 3 boxes of 7.62x54r armour piercing ammo boxes'),
        command_data: [`#Location ${user_account.user_steam_id} true`, '#SpawnItem Cal_7_62x54mmR_Ammobox 3'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}