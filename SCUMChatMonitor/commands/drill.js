const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('drill')
            .setDescription('Spawns a drill'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Drill 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 500,

        async execute(interaction) {

        }
    }
    return object;
}