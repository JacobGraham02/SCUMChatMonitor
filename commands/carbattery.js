const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carbattery')
            .setDescription('Spawns a car battery'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Car_Battery 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}