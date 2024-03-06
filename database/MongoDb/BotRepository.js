const crypto = require('crypto');
const DatabaseConnectionManager = require('./DatabaseConnectionManager');
const database_connection_manager = new DatabaseConnectionManager();

module.exports = class BotRepository {

    async findBotByUUID(bot_uuid) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');
            const bot = await bot_collection.findOne({ bot_uuid: bot_uuid });
            return bot;
        } catch (error) {
            console.error(`There was an error when attempting to fetch all bot data given a UUID. Please inform the server administrator of this error: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBot(bot_information, discord_server_data_id, ftp_server_data_id, bot_packages) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');

            const new_bot_document = {
                bot_username: bot_information.bot_username,
                bot_password: bot_information.bot_password,
                bot_email: bot_information.bot_email,
                bot_id: bot_information.bot_id,
                discord_data_id: discord_server_data_id,
                ftp_data_id: ftp_server_data_id,
                bot_packages: bot_packages.packages
            };

            await bot_collection.updateOne(
                { bot_id: bot_information.bot_id },
                { $setOnInsert: new_bot_document },
                { upsert: true}
            );
        } catch (error) {
            console.error(`There was an error when attempting to create a Disord bot document in the database. Please inform the server administrator of this error: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotDiscordData(bot_id, discord_server_data) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');

            const new_discord_data_document = {
                bot_id: bot_id,
                scum_ingame_chat_channel_id: discord_server_data.discord_ingame_chat_channel_id,
                scum_ingame_logins_channel_id: discord_server_data.discord_logins_chat_channel_id,
                scum_new_player_joins_channel_id: discord_server_data.discord_new_player_chat_channel_id,
                scum_battlemetrics_server_id: discord_server_data.discord_battlemetrics_server_id,
                scum_server_info_channel_id: discord_server_data.discord_server_info_button_channel_id
            };

            await bot_collection.updateOne(
                { bot_id: bot_id },
                { $setOnInsert: new_discord_data_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to insert Discord channel id(s) into the bot. Please inform the server administrator of this error: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    
    async createBotFtpServerData(bot_id, ftp_server_data) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');

            const new_ftp_server_data_document = {
                bot_id: bot_id,
                ftp_server_ip: ftp_server_data.server_hostname,
                ftp_server_port: ftp_server_data.ftp_server_port,
                ftp_server_username: ftp_server_data.ftp_server_username,
                ftp_server_password: ftp_server_data.ftp_server_password
            };

            await bot_collection.updateOne(
                { bot_id: bot_id },
                { $setOnInsert: new_ftp_server_data_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to insert FTP server data into the discord bot. Please contact the server administrator and inform them of this error: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotItemPackage(bot_id, bot_package) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');

            const new_bot_item_package_document = {
                bot_id: bot_id,
                package_name: bot_package.package_name,
                package_description: bot_package.package_description,
                package_cost: bot_package.package_cost,
                package_items: bot_package.package_items
            };

            await bot_collection.updateOne(
                { bot_id: bot_id },
                { $setOnInsert: new_bot_item_package_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot item package. Please inform the server administrator of this error: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    
    async releaseConnectionSafely(database_connection) {
        if (database_connection) {
            try {
                await database_connection_manager.releaseConnection(database_connection);
            } catch (error) {
                console.error('An error has occurred during the execution of releaseConnectionSafely function: ', error);
                throw error;
            }
        }
    }
}