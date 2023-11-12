const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('drill')
            .setDescription('Spawns a drill'),
        command_data: ['#SpawnItem Drill'],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}