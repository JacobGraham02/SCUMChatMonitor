import { ActionRowBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, ModalBuilder } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository.js'

export default function() {
    const setup_ftp_data_modal = {
        data: new SlashCommandBuilder()
            .setName('setupftpserver')
            .setDescription(`Associate an FTP server credentials with your Discord bot`)
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
                .setCustomId(`ftpServerInputModal`)
                .setTitle(`Enter FTP server data below:`)

            const ipv4AddressInput = new TextInputBuilder()
                .setCustomId(`ipv4AddressInput`)
                .setLabel(`xxx.xxx.xxx.xxx, where xxx is between 0 - 255`)
                .setRequired(true)
                .setPlaceholder(`192.168.0.1`)
                .setStyle(TextInputStyle.Short)

            const portNumberInput = new TextInputBuilder()
                .setCustomId(`portInput`)
                .setLabel(`A number between 1024-65535`)
                .setRequired(true)
                .setPlaceholder(`45000`)
                .setStyle(TextInputStyle.Short)

            const usernameInput = new TextInputBuilder()
                .setCustomId(`usernameInput`)
                .setLabel(`A valid FTP server username`)
                .setRequired(true)
                .setPlaceholder(`ftpuser01`)
                .setStyle(TextInputStyle.Short)

            const passwordInput = new TextInputBuilder()
                .setCustomId(`passwordInput`)
                .setLabel(`A valid FTP server password`)
                .setRequired(true)
                .setPlaceholder(`R76ReG4UKDw75gZeM8XU`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.ftp_server_ip) {
                    ipv4AddressInput.setValue(bot_data.ftp_server_ip);
                }
                if (bot_data.ftp_server_port) {
                    portNumberInput.setValue(bot_data.ftp_server_port);
                }
                if (bot_data.ftp_server_username) {
                    usernameInput.setValue(bot_data.ftp_server_username);
                }
                if (bot_data.ftp_server_password) {
                    passwordInput.setValue(bot_data.ftp_server_password);
                }
            }

            const firstActionRow = new ActionRowBuilder().addComponents(ipv4AddressInput);
            const secondActionRow = new ActionRowBuilder().addComponents(portNumberInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(usernameInput);
            const fourthActionRow = new ActionRowBuilder().addComponents(passwordInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);
            
            try {
                await interaction.showModal(modal);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show FTP server setup modal: ${error}`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the FTP server setup modal: ${error}`);
            }
        }
    }
    return setup_ftp_data_modal;
}