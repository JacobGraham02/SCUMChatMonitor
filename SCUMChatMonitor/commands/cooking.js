const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('cooking')
            .setDescription('Spawns a bunch of ingredients for avid cooks'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Pan', '#SpawnItem Pot1', '#SpawnItem Egg 4', '#SpawnItem BlackPepper', '#SpawnItem Sugar 1', '#SpawnItem SpicesMix_02', '#SpawnItem Butter', '#SpawnItem SeaSalt_02', '#SpawnItem Book_Cooking_Soup', '#SpawnItem Book_Cooking_BBQ', '#SpawnItem Book_Cooking_Stew', '#SpawnItem Book_Cooking_Pasta'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}