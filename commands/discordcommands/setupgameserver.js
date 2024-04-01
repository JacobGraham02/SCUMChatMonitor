import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository';

const { SlashCommandBuilder, ModalBuilder } = require('@discordjs/builders');

export default function() {
    const setup_game_server_modal = {
        data: new SlashCommandBuilder()
            .setName('setupgameserver')
            .setDescription(`Associate a game server IP address and port number with your bot`)
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
                .setCustomId(`gameServerInputModal`)
                .setTitle(`Enter game server data below:`)

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

            if (bot_data) {
                if (bot_data.game_server_ipv4_address) {
                    ipv4AddressInput.setValue(bot_data.game_server_ipv4_address);
                }
                if (bot_data.game_server_port) {
                    portNumberInput.setValue(bot_data.game_server_port);
                }
            }

            const firstActionRow = new ActionRowBuilder().addComponents(ipv4AddressInput);
            const secondActionRow = new ActionRowBuilder().addComponents(portNumberInput);

            modal.addComponents(firstActionRow, secondActionRow);
            
            try {
                await interaction.showModal(modal);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show the game server setup modal: ${error}`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the game server setup modal: ${error}`);
            }
        }
    }
    return setup_game_server_modal;
}