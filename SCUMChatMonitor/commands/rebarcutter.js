const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('rebarcutter')
            .setDescription('Spawns a rebar cutter'),
        command_data: ['#SpawnItem Rebar_Cutter'],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}