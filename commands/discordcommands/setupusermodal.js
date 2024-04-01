import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository';

const { SlashCommandBuilder, ModalBuilder } = require('@discordjs/builders');

export default function() {
    const setup_user_modal_object = {
        data: new SlashCommandBuilder()
            .setName('setupuser')
            .setDescription(`Register this user so they can access the bot website`)
            ,
        authorization_role_name: ["Bot administrator"],

        async execute(interaction) {
            const bot_repository = new BotRepository();
            const guild_id = interaction.guildId;
            let bot_data = undefined;

            try {
                bot_data = await bot_repository.getBotDataByGuildId(guild_id);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to fetch the bot by guild id. Please inform the server administrator of the following error: ${error}.`,ephemeral:true});
                throw new Error(`There was an error when attempting to fetch the bot by guild id. Please inform the server administrator of the following error: ${error}.`);
            }

            const modal = new ModalBuilder()
                .setCustomId(`userDataInputModal`)
                .setTitle(`Enter user data below:`)

            const usernameInput = new TextInputBuilder()
                .setCustomId(`usernameInput`)
                .setLabel(`A username that only contains uppercase or lowercase letters a to z, and numbers 0 to 9. Maximum of 32 characters`)
                .setRequired(true)
                .setPlaceholder(`Dalton Wexberg`)
                .setStyle(TextInputStyle.Short)

            const emailInput = new TextInputBuilder()
                .setCustomId(`emailInput`)
                .setLabel(`A valid email address (e.g., Johndoe027@gmail.com)`)
                .setRequired(true)
                .setPlaceholder(`Johndoe027@gmail.com`)
                .setStyle(TextInputStyle.Short)

            const passwordInput = new TextInputBuilder()
                .setCustomId(`passwordInput`)
                .setLabel(`A password that is a maximum of 32 characters`)
                .setRequired(true)
                .setPlaceholder(`kLe8PKz9nHe0Kr6zcAEy7m7b`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.bot_username) {
                    usernameInput.setValue(bot_data.bot_username);
                }
                if (bot_data.bot_email) {
                    emailInput.setValue(bot_data.bot_email);
                }
            } 

            const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(emailInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(passwordInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
            
            try {
                await interaction.showModal(modal);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show the user setup modal: ${error}`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the user setup modal: ${error}`);
            }
        }
    }
    return setup_user_modal_object;
}