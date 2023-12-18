const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo762x54r')
            .setDescription('Spawns 1 box of 7.62x54r armour piercing ammo'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Cal_7_62x54mmR_Ammobox 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}