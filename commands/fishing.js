const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('fishing')
            .setDescription('Spawns a bunch of fishing gear'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem FishingRod 1 Location ${user_account.user_steam_id}`, `#SpawnItem FishingReelPro 1 Location ${user_account.user_steam_id}`, `#SpawnItem FishingLine_4 1 Location ${user_account.user_steam_id}`, `#SpawnItem FishingFloaterPack2 1 Location ${user_account.user_steam_id}`, `#SpawnItem FishingHookPack4 1 Location ${user_account.user_steam_id}`, `#SpawnItem FishingBait_Sardine 10 Location ${user_account.user_steam_id}`, `#SpawnItem FishingBait_BoiliesPrm1 10 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {
            
        }
    }
    return object;
}