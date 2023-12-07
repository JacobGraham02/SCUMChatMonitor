const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('rebarcutter')
            .setDescription('Spawns a rebar cutter'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Rebar_Cutter 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 500,

        async execute(interaction) {

        }
    }
    return object;
}