const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('drill')
            .setDescription('Spawns a drill'),
        command_data: [`#Location ${user_account.user_steam_id} true`, '#SpawnItem Drill'],
        authorization_role_name: [],
        command_cost: 500,

        async execute(interaction) {

        }
    }
    return object;
}