const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('laikawheel')
            .setDescription('Spawns a laika wheel'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Wheel_255_55_R16_Item 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}