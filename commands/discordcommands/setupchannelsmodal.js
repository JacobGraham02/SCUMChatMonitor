import { ActionRowBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, ModalBuilder } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository.js';

export default function() {
    const setup_user_modal_object = {
        data: new SlashCommandBuilder()
            .setName('setupchannels')
            .setDescription(`Register channels so the bot can send information to them`)
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
                .setCustomId(`channelIdsInputModal`)
                .setTitle(`Enter channel id data below where each id contains 19 numbers from 0 to 9`)

            const ingameChatIdInput = new TextInputBuilder()
                .setCustomId(`ingameChatChannelInput`)
                .setLabel(`Game chat channel id`)
                .setRequired(true)
                .setMinLength(19)
                .setMaxLength(19)
                .setPlaceholder(`5893640123478915762`)
                .setStyle(TextInputStyle.Short)

            const loginsIdInput = new TextInputBuilder()
                .setCustomId(`loginsChannelInput`)
                .setLabel(`Game log ins and log outs channel id`)
                .setRequired(true)
                .setMinLength(19)
                .setMaxLength(19)
                .setPlaceholder(`5893640123478915762`)
                .setStyle(TextInputStyle.Short)

            const newPlayerJoinsIdInput = new TextInputBuilder()
                .setCustomId(`newPlayerJoinsChannelInput`)
                .setLabel(`Game new player joins channel id`)
                .setRequired(true)
                .setMinLength(19)
                .setMaxLength(19)
                .setPlaceholder(`5893640123478915762`)
                .setStyle(TextInputStyle.Short)

            const battlemetricsServerIdInput = new TextInputBuilder()
                .setCustomId(`battlemetricsServerInput`)
                .setLabel(`Battlemetrics server id`)
                .setRequired(true)
                .setPlaceholder(`24767557`)
                .setStyle(TextInputStyle.Short)

            const serverInfoButtonIdInput = new TextInputBuilder()
                .setCustomId(`serverInfoButtonInput`)
                .setLabel(`Game server information button channel id`)
                .setRequired(true)
                .setMinLength(19)
                .setMaxLength(19)
                .setPlaceholder(`5893640123478915762`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.scum_ingame_chat_channel_id) {
                    ingameChatIdInput.setValue(bot_data.scum_ingame_chat_channel_id);
                }
                if (bot_data.scum_ingame_logins_channel_id) {
                    loginsIdInput.setValue(bot_data.scum_ingame_logins_channel_id);
                }
                if (bot_data.scum_new_player_joins_channel_id) {
                    newPlayerJoinsIdInput.setValue(bot_data.scum_new_player_joins_channel_id);
                }
                if (bot_data.scum_battlemetrics_server_id) {
                    battlemetricsServerIdInput.setValue(bot_data.scum_battlemetrics_server_id);
                }
                if (bot_data.scum_server_info_channel_id) {
                    serverInfoButtonIdInput.setValue(bot_data.scum_server_info_channel_id);
                }
            }
        
            const secondActionRow = new ActionRowBuilder().addComponents(ingameChatIdInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(loginsIdInput);
            const fourthActionRow = new ActionRowBuilder().addComponents(newPlayerJoinsIdInput);
            const fifthActionRow = new ActionRowBuilder().addComponents(battlemetricsServerIdInput);
            const sixthActionRow = new ActionRowBuilder().addComponents(serverInfoButtonIdInput);


            modal.addComponents(secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow, sixthActionRow);
            
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