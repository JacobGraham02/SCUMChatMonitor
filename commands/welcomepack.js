const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('welcomepack')
            .setDescription('You will receive a bounty of items when using this command'), 
        command_data: [`${user_account.user_steam_name} your package has been dispatched`, `#SpawnItem MilitaryBoots_Peace 1 Location ${user_account.user_steam_id}`, `#SpawnItem Weapon_Cleaning_Kit 1 Location ${user_account.user_steam_id}`, `#SpawnItem 1H_Bushman 1 Location ${user_account.user_steam_id}`, `#SpawnItem Water_05l 1 Location ${user_account.user_steam_id}`, `#SpawnItem MRE_Cheeseburger 2 Location ${user_account.user_steam_id}`, `#SpawnItem Emergency_bandage_big 1 Location ${user_account.user_steam_id}`, `#SpawnItem Antibiotics_03 1 Location ${user_account.user_steam_id}`, `#SpawnItem Tactical_Handgun_Holster_03 1 Location ${user_account.user_steam_id}`, `#SpawnItem Hiking_Backpack_01_05 1 Location ${user_account.user_steam_id}`, `#SpawnItem Cal_9mm_Ammobox_TR 2 Location ${user_account.user_steam_id}`, `#SpawnItem Magazine_M9 1 Location ${user_account.user_steam_id}`, `#SpawnItem WeaponSuppressor_Handgun 1 Location ${user_account.user_steam_id}`, `#SpawnItem Weapon_M9_Silver 1 Location ${user_account.user_steam_id}`, `#Teleport 0 0 0`],
        authorization_role_name: [],
        command_cost: 0,

        async execute(interaction) { 
            await interaction.reply(`Please log into TheTrueCastaways SCUM server and type the following command to get this pack: !welcomepack`);
        }
    }
    return object;
}
