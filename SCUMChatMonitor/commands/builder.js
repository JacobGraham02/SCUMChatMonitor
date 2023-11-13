const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('builder')
            .setDescription('Spawns a bunch of supplies for avid home builders'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Tool_Box 3', '#SpawnItem Chainsaw', '#SpawnItem Gasoline_Canister_Small', '#SpawnItem Bundle_Wooden_Plank 5', '#SpawnItem Nails_Package_Box 3', '#SpawnItem Bolts_Package_Box 3', '#SpawnItem Bundle_Of_Rags 5', '#SpawnItem Metal_Scrap_05 10'],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}