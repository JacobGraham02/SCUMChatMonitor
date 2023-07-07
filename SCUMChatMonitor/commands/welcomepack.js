// `#Location ${player_steam_id} true`, `#SpawnItem Cal_22`

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (player_steam_id) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('welcomepack')
            .setDescription('You will receive a bounty of items when using this command'),
        command_data: [`#Location ${player_steam_id} true`, `#SpawnItem MilitaryBoots_Peace`, `#SpawnItem Weapon_Cleaning_Kit`,`#SpawnItem 1H_Bushman`, `#SpawnItem Water_05l`, `#SpawnItem MRE_Cheeseburger 2`, `#SpawnItem Emergency_bandage_big`, `#SpawnItem Antibiotics_03`, `#SpawnItem Tactical_Handgun_Holster_03`, `#SpawnItem Hiking_Backpack_01_05`, `#SpawnItem Cal_9mm_Ammobox_TR 2`, `#SpawnItem Magazine_M9`, `#SpawnItem WeaponSuppressor_Handgun`, `#SpawnItem Weapon_M9_Silver`],
        authorization_role_name: ['Admin'],

        async execute(interaction) { 
            await interaction.reply(`Please log into TheTrueCastaways SCUM server and type the following message to get this pack: !testpackage`);
        }
    }
    return object;
}