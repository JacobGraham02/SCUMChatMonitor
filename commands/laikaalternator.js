const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('laikaalternator')
            .setDescription('Spawns a laika alternator'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Laika_Engine_Alternator_Item 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 3500,

        async execute(interaction) {

        }
    }
    return object;
}