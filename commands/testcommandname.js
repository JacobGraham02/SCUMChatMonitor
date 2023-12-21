
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('testcommandname')
            .setDescription('test desc'),
        command_data: ['{user_steam_name} your package has been dispatched', "#SpawnItem Improvised Quiver 01 1 Location 1"],
        authorization_role_name: [],
        command_cost: 111,

        async execute(interaction) {
            this.replaceCommandDataLocation(user_account.user_steam_id);
            await interaction.reply("Please log into TheTrueCastaways SCUM server and type the command '/testcommandname' into local or global chat");
        },

        replaceCommandUserSteamName() {
            this.command_data = this.command_data.map(command_string => {
                return command_string.replace('{user_steam_name}', user_steam_name);
            });
        },

        replaceCommandItemSpawnLocation() {
            this.command_data = this.command_data.map(command_string => {
                return command_string.replace('Location 1', 'Location ' + user_account.user_steam_id);
            })
        }
    }
    return object;
}