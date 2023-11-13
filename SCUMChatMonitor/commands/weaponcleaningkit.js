const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('weaponcleaningkit')
            .setDescription('Spawns a weapon cleaning kit'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Weapon_Cleaning_Kit'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}