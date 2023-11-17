const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo556x45')
            .setDescription('Spawns 3 5.56x45 armour piercing ammo boxes'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Cal_5_56x45mm_AP_Ammobox 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}