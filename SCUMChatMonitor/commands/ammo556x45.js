const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo556x45')
            .setDescription('Spawns an improvised hand gun'),
        command_data: ['#SpawnItem Cal_5_56x45mm_AP_Ammobox 3'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}