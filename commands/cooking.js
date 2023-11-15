const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('cooking')
            .setDescription('Spawns a bunch of ingredients for avid cooks'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Pan 1 Location ${user_account.user_steam_id}`, `#SpawnItem Pot1 1 Location ${user_account.user_steam_id}`, `#SpawnItem Egg 4 Location ${user_account.user_steam_id}`, `#SpawnItem BlackPepper 1 Location ${user_account.user_steam_id}`, `#SpawnItem Sugar 1 Location ${user_account.user_steam_id}`, `#SpawnItem SpicesMix_02 1 Location ${user_account.user_steam_id}`, `#SpawnItem Butter 1 Location ${user_account.user_steam_id}`, `#SpawnItem SeaSalt_02 1 Location ${user_account.user_steam_id}`, `#SpawnItem Book_Cooking_Soup 1 Location ${user_account.user_steam_id}`, `#SpawnItem Book_Cooking_BBQ 1 Location ${user_account.user_steam_id}`, `#SpawnItem Book_Cooking_Stew 1 Location ${user_account.user_steam_id}`, `#SpawnItem Book_Cooking_Pasta 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}