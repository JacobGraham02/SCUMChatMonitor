const { SlashCommandBuilder } = require('@discordjs/builders');

export default function() {
    const change_bot_username_object = {
        data: new SlashCommandBuilder()
            .setName('change-bot-username')
            .setDescription(`Use this commnd to change the username of the bot`)
            .addStringOption(option =>
                option.setName(`bot-username`)
                .setDescription(`(Required) new username for bot`)
                .setRequired(true)  
            ),
        authorization_role_name: ["Administrator"],

        async execute(interaction) {
            const new_bot_username = interaction.options.getString(`bot-username`);

            if (!new_bot_username) {
                await interaction.reply({content:`The username that the bot will be renamed to is undefined. Please try again or contact the server administrator if you believe this is an error: ${error}`});
                return;
            }

            try {
                await interaction.client.user.setUsername(new_bot_username);
                await interaction.reply({content:`The Discord bot username has been changed to: ${new_bot_username}`, ephemeral: true});
            } catch (error) {
                console.error(`There was an error when attempting to change the Discord bot username: ${error}`);
                await interaction.reply({content:`There was an error when attempting to change the Discord bot username. Please contact the server administrator if you believe this is an error: ${error}`});
                throw error;
            }
        }
    }

    return change_bot_username_object;
}