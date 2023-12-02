const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
	async execute(interaction) {
		const server_info_buttons = new ButtonBuilder()
			.setCustomId('serverinfo')
			.setLabel('View server info')
			.setStyle(ButtonStyle.Success);

		const button_row = new ActionRowBuilder()
			.addComponents(server_info_buttons);

		await interaction.reply({
			content: `Are you sure you want to ban ${target} for reason: ${reason}?`,
			components: [button_row],
		});
	},
};
