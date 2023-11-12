const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('balance')
            .setDescription('Gives you your account balance'),
        command_data: [`${user_account.user_steam_name} your account balance is ${user_account.user_money}`],
        authorization_role_name: [],
        command_cost: 0,

        async execute(interaction) {

        }
    }
    return object;
}