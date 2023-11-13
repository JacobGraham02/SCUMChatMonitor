const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('improvisedhandgun')
            .setDescription('Spawns an improvised hand gun'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Weapon_Improvised_Handgun', '#SpawnItem Cal_50_AE_Ammobox', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}