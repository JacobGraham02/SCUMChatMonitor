const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('medicine')
            .setDescription('Spawns a bunch of medical items'),
        command_data: ['#SpawnItem Antibiotics_03', '#SpawnItem Emergency_bandage_Big', '#SpawnItem Aspirin', '#SpawnItem PainKillers_03', '#SpawnItem 1H_Dildo'],
        authorization_role_name: [],
        command_cost: 2000,

        async execute(interaction) {

        }
    }
    return object;
}