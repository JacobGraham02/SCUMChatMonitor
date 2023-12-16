const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Gives you help'),
        command_data: [`The /welcomepack command gives you a welcomepack`, `The /discord command gives you our Discord server link`, `Join the Discord at https://discord.gg/4BYPXWSFkv to view more commands`],
        authorization_role_name: [],
        command_cost: 500,

        async execute(interaction) {

        }
    }
    return object;
}