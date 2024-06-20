import { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, SlashCommandBuilder } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository.js';

export default function() {
    const setup_user_modal_object = {
        data: new SlashCommandBuilder()
            .setName('setupuser')
            .setDescription(`Register this user so they can access the bot website`)
            ,
        authorization_role_name: ["Bot administrator"],

        async execute(interaction) {
            const guild_id = interaction.guildId;
            const bot_repository = new BotRepository(guild_id);
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
                .setLabel(`Username: a-z, A-Z, 0-9 (e.g., Jacob Graham)`)
                .setMinLength(1)
                .setMaxLength(32)
                .setRequired(true)
                .setPlaceholder(`Dalton Wexberg`)
                .setStyle(TextInputStyle.Short)

            const emailInput = new TextInputBuilder()
                .setCustomId(`emailInput`)
                .setLabel(`A valid email (e.g., Johndoe027@gmail.com)`)
                .setMinLength(1)
                .setMaxLength(100)
                .setRequired(true)
                .setPlaceholder(`Johndoe027@gmail.com`)
                .setStyle(TextInputStyle.Short)

            const passwordInput = new TextInputBuilder()
                .setCustomId(`passwordInput`)
                .setLabel(`Password: a-z, A-Z, 0-9 (e.g., kLe8PKz9nHepV)`)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32)
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