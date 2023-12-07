const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagentire')
            .setDescription('Spawns a wolks wagen wheel'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Wheel_155_R65_Item 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}