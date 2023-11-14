const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('improvisedhandgun')
            .setDescription('Spawns an improvised hand gun'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Weapon_Improvised_Handgun 1 Location ${user_account.user_steam_id}`, `#SpawnItem Cal_50_AE_Ammobox 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}