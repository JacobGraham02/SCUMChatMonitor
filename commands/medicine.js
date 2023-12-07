const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('medicine')
            .setDescription('Spawns a bunch of medical items'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Antibiotics_03 1 Location ${user_account.user_steam_id}`, `#SpawnItem Emergency_bandage_Big 1 Location ${user_account.user_steam_id}`, `#SpawnItem Aspirin 1 Location ${user_account.user_steam_id}`, `#SpawnItem PainKillers_03 1 Location ${user_account.user_steam_id}`, `#SpawnItem Vitamins_03 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}