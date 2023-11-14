const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('builder')
            .setDescription('Spawns a bunch of supplies for avid home builders'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Tool_Box 3 Location ${user_account.user_steam_id}`, `#SpawnItem Chainsaw 1 Location ${user_account.user_steam_id}`, `#SpawnItem Gasoline_Canister_Small 1 Location ${user_account.user_steam_id}`, `#SpawnItem Bundle_Wooden_Plank 5 Location ${user_account.user_steam_id}`, `#SpawnItem Nails_Package_Box 3 Location ${user_account.user_steam_id}`, `#SpawnItem Bolts_Package_Box 3 Location ${user_account.user_steam_id}`, `#SpawnItem Bundle_Of_Rags 5 Location ${user_account.user_steam_id}`, `#SpawnItem Metal_Scrap_05 10 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}