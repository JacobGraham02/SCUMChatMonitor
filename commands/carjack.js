const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carjack')
            .setDescription('Spawns a car jack'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Car_Jack 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2500,

        async execute(interaction) {

        }
    }
    return object;
}