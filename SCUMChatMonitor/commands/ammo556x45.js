const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('ammo556x45')
            .setDescription('Spawns 3 5.56x45 armour piercing ammo boxes'),
        command_data: [`#Location ${player_steam_id.user_steam_id} true`, '#SpawnItem Cal_5_56x45mm_AP_Ammobox 3'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}