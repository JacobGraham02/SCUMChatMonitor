const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo30x06')
            .setDescription('Spawns 3x20 stacks of 30-06 armor piercing bullets'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Cal_30-06_AP 1 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}