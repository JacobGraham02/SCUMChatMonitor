const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo762x39')
            .setDescription('Spawns 3 boxes of 7.62x39 armour piercing ammo boxes'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Cal_7_62x39mm_AP_Ammobox 3 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}