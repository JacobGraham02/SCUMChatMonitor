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
            throw new Error(`There was an error when attempting to fetch all bot data given a UUID. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBot(bot_information) {
        const database_connection = await database_connection_manager.getConnection();
        const bot_password_salt = bot_information.bot_password.substring(0, 32);
        const new_bot_document = {
            bot_username: bot_information.bot_username,
            bot_password: bot_information.bot_password,
            bot_salt: bot_password_salt,
            bot_email: bot_information.bot_email,
            guild_id: bot_information.guild_id,
        };
    
        if (!bot_information.bot_id) {
            new_bot_document.bot_id = crypto.randomUUID();
        }
    
        try {
            const bot_collection = database_connection.collection('bot');
    
            await bot_collection.updateOne(
                { guild_id: bot_information.guild_id },
                { $set: new_bot_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to create a Discord bot document in the database. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to create a Discord bot document in the database. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotDiscordData(discord_server_data) {
        const database_connection = await database_connection_manager.getConnection();
        const new_discord_data_document = {
            scum_ingame_chat_channel_id: discord_server_data.discord_ingame_chat_channel_id,
            scum_ingame_logins_channel_id: discord_server_data.discord_logins_chat_channel_id,
            scum_new_player_joins_channel_id: discord_server_data.discord_new_player_chat_channel_id,
            scum_battlemetrics_server_id: discord_server_data.discord_battlemetrics_server_id,
            scum_server_info_channel_id: discord_server_data.discord_server_info_button_channel_id,
        };

        try {
            const bot_discord_data_collection = database_connection.collection('bot');

            await bot_discord_data_collection.updateOne(
                { guild_id: discord_server_data.guild_id },
                { $set: new_discord_data_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to insert Discord channel id(s) into the bot. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to insert Discord channel id(s) into the bot. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    
    async createBotFtpServerData(ftp_server_data) {
        const database_connection = await database_connection_manager.getConnection();
        const new_ftp_server_data_document = {
            ftp_server_ip: ftp_server_data.server_hostname,
            ftp_server_port: ftp_server_data.server_port,
            ftp_server_username: ftp_server_data.server_username,
            ftp_server_password: ftp_server_data.server_password
        };

        try {
            const bot_ftp_server_data_collection = database_connection.collection('bot');

            await bot_ftp_server_data_collection.updateOne(
                { guild_id: ftp_server_data.guild_id },
                { $set: new_ftp_server_data_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to insert FTP server data into the discord bot. Please contact the server administrator and inform them of this error: ${error}`);
            throw new Error(`There was an error when attempting to insert FTP server data into the discord bot. Please contact the server administrator and inform them of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotGameServerData(game_server_data) {
        const database_connection = await database_connection_manager.getConnection();

        const new_bot_game_server_document = {
            game_server_ipv4_address: game_server_data.game_server_hostname_input,
            game_server_port: game_server_data.game_server_port_input
        };

        try {
            const bot_game_server_data_collection = database_connection.collection('bot');
            
            await bot_game_server_data_collection.updateOne(
                { guild_id: game_server_data.guild_id },
                { $set: new_bot_game_server_document },
                { upsert: true }
            )
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot game server document. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot game server document. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotItemPackage(bot_id, bot_package) {
        const database_connection = await database_connection_manager.getConnection();

        const new_bot_item_package_document = {
            bot_id: bot_id,
            package_name: bot_package.package_name,
            package_description: bot_package.package_description,
            package_cost: bot_package.package_cost,
            package_items: bot_package.package_items
        };

        try {
            const bot_collection = database_connection.collection('bot_packages');

            await bot_collection.updateOne(
                { bot_id: bot_id },
                { $setOnInsert: new_bot_item_package_document },
                { upsert: true }
            );
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot item package. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot item package. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async getBotItemPackageData(bot_id) {
        const database_connection = await database_connection_manager.getConnection();
        
        try {
            const bot_packages_collection = database_connection.collection('bot_packages');

            const bot_packages = await bot_packages_collection.find({ bot_id: bot_id }).toArray();
            
            return bot_packages;
        } catch (error) {
            console.error(`There was an error when attempting to retrieve all of the bot packages. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to retrieve all of the bot packages. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async getBotPackageFromName(bot_package_name) {
        const database_connection = await database_connection_manager.getConnection();

        try {
            const bot_packages_collection = database_connection.collection('bot_packages');

            const bot_packages = await bot_packages_collection.findOne({ package_name: bot_package_name });

            return bot_packages;
        } catch (error) {
            console.error(`There was an error when attempting to retrieve the bot package by name. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to retrieve the bot package by name. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async getBotDataByGuildId(guild_id) {
        const database_connection = await database_connection_manager.getConnection();
    
        try {
            const bot_collection = database_connection.collection('bot');
    
            const bot_data = await bot_collection.findOne({ guild_id: guild_id });
    
            return bot_data;
        } catch (error) {
            console.error(`There was an error when attempting to retrieve the bot data by guild id. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to retrieve the bot data by guild id. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async getBotDataByEmail(bot_email) {
        const database_connection = await database_connection_manager.getConnection();
    
        try {
            const bot_collection = database_connection.collection('bot');
    
            const bot_data = await bot_collection.findOne({ bot_email: bot_email });
    
            return bot_data;
        } catch (error) {
            console.error(`There was an error when attempting to retrieve the bot data by email. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to retrieve the bot data by email. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    
    async releaseConnectionSafely(database_connection) {
        if (database_connection) {
            try {
                await database_connection_manager.releaseConnection(database_connection);
            } catch (error) {
                console.error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
                throw new Error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
            }
        }
    }
}