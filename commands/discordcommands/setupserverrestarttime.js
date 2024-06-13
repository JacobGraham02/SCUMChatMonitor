import { ActionRowBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, ModalBuilder } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository.js';

export default function() {
    const setup_user_modal_object = {
        data: new SlashCommandBuilder()
            .setName('setuprestarttime')
            .setDescription(`The bot will inform users of server restarts`)
        ,
        authorization_role_name: ["Bot administrator"],

        async execute(interaction) {
            const guild_id = interaction.guildId;
            const bot_repository = new BotRepository(guild_id);
            let bot_data = undefined;

            try {
                bot_data = await bot_repository.getBotDataByGuildId(guild_id);
            } catch (error) {
                await interaction.reply({content: `There was an error when attempting to fetch bot data by guild id. Please inform the server administrator of the following error: ${error}`});
                throw new Error(`There was an error when attempting to fetch bot data by guild id. Please inform the server administrator of the following error: ${error}`);
            }

            const modal = new ModalBuilder()
                .setCustomId(`restarttimesmodal`)
                .setTitle(`Enter server restart times below:`)

            const restartTimesInputOne = new TextInputBuilder()
                .setCustomId(`restartTimeOne`)
                .setTitle(`Enter time for server restart 1 below:`)
                .setRequired(true)
                .setPlaceholder(`(Required) 18:00`)
                .setTyle(TextInputStyle.Short)

            const restartTimesInputTwo = new TextInputBuilder()
                .setCustomId("restartTimeTwo")
                .setTitle(`Enter time for server restart 2 below:`)
                .setRequired(true)
                .setPlaceholder(`(Required) 06:00`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.restart_time_one) {
                    restartTimesInputOne.setValue(bot_data.restart_time_one);
                }
                if (bot_data.restart_time_two) {
                    restartTimesInputTwo.setValue(bot_data.restart_time_two);
                }
            }

            const firstActionRow = new ActionRowBuilder().addComponents(
                restartTimesInputOne,
                restartTimesInputTwo
            )

            modal.addComponents(firstActionRow);

            try {
                await interaction.showModal(modal);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show the server restart time modal: ${error}. Please inform the server administrator of this error`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the server restart time modal: ${error}. Please inform the server administrator of this error`);
            }
        }
    }
    return setup_user_modal_object;
}