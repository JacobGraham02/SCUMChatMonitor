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
                .setCustomId(`battlemetricsServerIdModal`)
                .setTitle(`Enter battlemetrics server id below:`)

            const battlemetricsServerIdInput = new TextInputBuilder()
                .setCustomId(`battlemetricsServerInput`)
                .setLabel(`Battlemetrics server id`)
                .setRequired(true)
                .setPlaceholder(`24767557`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.scum_battlemetrics_server_id) {
                    battlemetricsServerIdInput.setValue(bot_data.scum_battlemetrics_server_id);
                }
            }
        
            const firstActionRow = new ActionRowBuilder().addComponents(battlemetricsServerIdInput);


            modal.addComponents(firstActionRow);
            
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