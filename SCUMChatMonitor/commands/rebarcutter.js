const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('rebarcutter')
            .setDescription('Spawns a rebar cutter'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Rebar_Cutter'],
        authorization_role_name: [],
        command_cost: 500,

        async execute(interaction) {

        }
    }
    return object;
}