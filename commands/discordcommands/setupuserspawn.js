import { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, SlashCommandBuilder } from 'discord.js';
import BotRepository from '../../database/MongoDb/BotRepository.js';

export default function() {
    const setup_user_spawn_coordinates = {
        data: new SlashCommandBuilder()
            .setName('setupuserspawn')
            .setDescription(`Register spawn coordinates for new players to be teleported to`)
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
                .setCustomId(`userSpawnCoordsInputModal`)
                .setTitle(`Enter user spawn coordinates below:`)

            const xCoordinateInput = new TextInputBuilder()
                .setCustomId(`xCoordinateInput`)
                .setLabel(`A valid x coordinate (e.g., 150184.943)`)
                .setMinLength(1)
                .setMaxLength(32)
                .setRequired(true)
                .setPlaceholder(`150184.943`)
                .setStyle(TextInputStyle.Short)

            const yCoordinateInput = new TextInputBuilder()
                .setCustomId(`yCoordinateInput`)
                .setLabel(`A valid y coordinate (e.g., -251920.7903)`)
                .setMinLength(1)
                .setMaxLength(32)
                .setRequired(true)
                .setPlaceholder(`-251920.7903`)
                .setStyle(TextInputStyle.Short)

            const zCoordinateInput = new TextInputBuilder()
                .setCustomId(`zCoordinateInput`)
                .setLabel(`A valid z coordinate (e.g., 0)`)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32)
                .setPlaceholder(`0`)
                .setStyle(TextInputStyle.Short)

            if (bot_data) {
                if (bot_data.x_coordinate) {
                    xCoordinateInput.setValue(bot_data.x_coordinate);
                }
                if (bot_data.y_coordinate) {
                    yCoordinateInput.setValue(bot_data.y_coordinate);
                }
                if (bot_data.z_coordinate) {
                    zCoordinateInput.setValue(bot_data.z_coordinate);
                }
            } 

            const firstActionRow = new ActionRowBuilder().addComponents(xCoordinateInput);
            const secondActionRow = new ActionRowBuilder().addComponents(yCoordinateInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(zCoordinateInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
            
            try {
                await interaction.showModal(modal);
            } catch (error) {
                await interaction.reply({content:`There was an error when attempting to show the starting user coordinates form: ${error}`,ephemeral:true});
                throw new Error(`There was an error when attempting to show the starting user coordinates form: ${error}`);
            }
        }
    }
    return setup_user_spawn_coordinates;
}