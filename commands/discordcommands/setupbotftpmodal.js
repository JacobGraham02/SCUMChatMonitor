import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

const { SlashCommandBuilder, ModalBuilder } = require('@discordjs/builders');

export default function() {
    const setup_ftp_data_modal = {
        data: new SlashCommandBuilder()
            .setName('setupftpserver')
            .setDescription(`Associate an FTP server credentials with your Discord bot`)
            ,
        authorization_role_name: ["Bot administrator"],

        async execute(interaction) {
            const modal = new ModalBuilder()
                .setCustomId(`ftpServerInputModal`)
                .setTitle(`Enter FTP server data below:`)

            const ipv4AddressInput = new TextInputBuilder()
                .setCustomId(`ipv4AddressInput`)
                .setLabel(`A valid IPv4 address that looks like the following: xxx.xxx.xxx.xxx, where xxx is a number ranging from 0 - 255 (e.g., 192.168.0.1)`)
                .setRequired(true)
                .setPlaceholder(`192.168.0.1`)
                .setStyle(TextInputStyle.Short)

            const portNumberInput = new TextInputBuilder()
                .setCustomId(`portInput`)
                .setLabel(`A valid port number ranging from 1024-65535 (e.g., 45000)`)
                .setRequired(true)
                .setPlaceholder(`45000`)
                .setStyle(TextInputStyle.Short)

            const usernameInput = new TextInputBuilder()
                .setCustomId(`usernameInput`)
                .setLabel(`A valid FTP server username (e.g., ftpuser01)`)
                .setRequired(true)
                .setPlaceholder(`ftpuser01`)
                .setStyle(TextInputStyle.Short)

            const passwordInput = new TextInputBuilder()
                .setCustomId(`passwordInput`)
                .setLabel(`A valid FTP server password (e.g., R76ReG4UKDw75gZeM8XU)`)
                .setRequired(true)
                .setPlaceholder(`R76ReG4UKDw75gZeM8XU`)
                .setStyle(TextInputStyle.Short)

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