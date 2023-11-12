const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('restarttime')
            .setDescription('Tells you at what time the server restarts'),
        command_data: [`#Location ${user_account.user_steam_id} true`, `${user_account.user_steam_name} the server restarts at 6:00 AM EST every day. You will get several warning before the server restarts`],
        authorization_role_name: [],
        command_cost: 0,

        async execute(interaction) {

        }
    }
    return object;
}