const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('wolkswagenalternator')
            .setDescription('Spawns a wolks wagen alternator'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem WW_Engine_Alternator_Item 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 3500,

        async execute(interaction) {

        }
    }
    return object;
}