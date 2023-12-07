const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('sewingkit')
            .setDescription('Spawns a sewing kit'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Sewing_kit 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 1000,

        async execute(interaction) {

        }
    }
    return object;
}