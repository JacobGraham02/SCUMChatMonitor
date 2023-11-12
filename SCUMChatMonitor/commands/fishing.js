const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('fishing')
            .setDescription('Spawns a bunch of fishing gear')
            .addStringOption(options =>
                options.setName('test_option')
                    .setDescription('The description of test option')),
        command_data: ['#SpawnItem FishingRod', '#SpawnItem FishingReelPro', '#SpawnItem FishingLine_4', '#SpawnItem FishingFloaterPack2', '#SpawnItem FishingHookPack4', '#SpawnItem FishingBait_Sardine 10', '#SpawnItem FishingBait_BoiliesPrm1 10'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {
            
        }
    }
    return object;
}