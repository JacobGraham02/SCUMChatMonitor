const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('weaponcleaningkit')
            .setDescription('Spawns a weapon cleaning kit'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Weapon_Cleaning_Kit 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}