const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('carbattery')
            .setDescription('Spawns a car battery'),
        command_data: [`#Location ${user_account.user_steam_id} true`, '#SpawnItem Car_Battery'],
        authorization_role_name: [],
        command_cost: 1500,

        async execute(interaction) {

        }
    }
    return object;
}