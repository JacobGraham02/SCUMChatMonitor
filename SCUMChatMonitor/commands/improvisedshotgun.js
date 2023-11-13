const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('improvisedshotgun')
            .setDescription('Spawns an improvised shot gun'),
        command_data: [`#TeleportTo ${player_steam_id.user_steam_id}`, '#SpawnItem Weapon_Improvised_Shotgun', '#SpawnItem 12_Gauge_Buckshot_Ammobox 2', `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}