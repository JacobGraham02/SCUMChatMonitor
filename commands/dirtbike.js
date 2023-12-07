const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('dirtbike')
            .setDescription('Spawns a dirt bike'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnVehicle BPC_Dirtbike 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 45000,

        async execute(interaction) {

        }
    }
    return object;
}