const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('improvisedshotgun')
            .setDescription('Spawns an improvised shot gun'),
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem Weapon_Improvised_Shotgun 1 Location ${user_account.user_steam_id}`, `#SpawnItem 12_Gauge_Buckshot_Ammobox 2 Location ${user_account.user_steam_id}`],
        authorization_role_name: [],
        command_cost: 4000,

        async execute(interaction) {

        }
    }
    return object;
}