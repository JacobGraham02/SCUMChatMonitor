import { randomUUID } from 'crypto';
import DatabaseConnectionManager from './DatabaseConnectionManager.js';
import dotenv from 'dotenv';
dotenv.config();

export default class BotRepository {

    constructor(websocket_id) {
        const database_name = `ScumChatMonitor_${websocket_id}`;
        this.websocket_id = websocket_id;
        this.database_connection_manager = new DatabaseConnectionManager(database_name);
    }

    async findBotByUUID(bot_uuid) {
        const database_connection = await this.this.database_connection_manager.getConnection();
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
        const database_connection = await this.database_connection_manager.getConnection();
        const new_bot_document = {
            bot_username: bot_information.bot_username,
            bot_password: bot_information.bot_password_hash,
            bot_salt: bot_information.bot_password_salt,
            bot_email: bot_information.bot_email,
            guild_id: bot_information.guild_id,
        };

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
        const database_connection = await this.database_connection_manager.getConnection();
        const new_discord_data_document = {
            scum_bot_commands_channel_id: discord_server_data.discord_bot_commands_channel_id,
            scum_ingame_chat_channel_id: discord_server_data.discord_ingame_chat_channel_id,
            scum_ingame_logins_channel_id: discord_server_data.discord_logins_chat_channel_id,
            scum_new_player_joins_channel_id: discord_server_data.discord_new_player_chat_channel_id,
            scum_server_info_channel_id: discord_server_data.discord_server_info_button_channel_id,
            scum_server_online_channel_id: discord_server_data.discord_server_online_channel_id,
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

    async createBotBattlemetricsData(battlemetrics_server_info) {
        const database_connection = await this.database_connection_manager.getConnection();
        const new_discord_data_document = {
            scum_battlemetrics_server_id: battlemetrics_server_info.discord_battlemetrics_server_id
        };

        try {
            const bot_discord_data_collection = database_connection.collection('bot');

            await bot_discord_data_collection.updateOne(
                { guild_id: battlemetrics_server_info.guild_id },
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

    async createBotTeleportNewPlayerCoordinates(teleport_command) {
        const database_connection = await this.database_connection_manager.getConnection();
        const new_start_area_data_document = {
            command_prefix: teleport_command.prefix,
            x_coordinate: teleport_command.x,
            y_coordinate: teleport_command.y,
            z_coordinate: teleport_command.z
        };

        try {
            const bot_collection = database_connection.collection('bot');

            await bot_collection.updateOne(
                { guild_id: teleport_command.guild_id },
                { $set: new_start_area_data_document },
                { upsert: true}
            );
        } catch (error) {
            console.error(`There was an error when attempting to insert a start teleport area into the discord bot. Please contact the server administrator and inform them of this error: ${error}`);
            throw new Error(`There was an error when attempting to insert a start teleport area into the discord bot. Please contact the server administrator and inform them of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotFtpServerData(ftp_server_data) {
        const database_connection = await this.database_connection_manager.getConnection();
        const new_ftp_server_data_document = {
            ftp_server_ip: ftp_server_data.ftp_server_hostname,
            ftp_server_port: ftp_server_data.ftp_server_port,
            ftp_server_username: ftp_server_data.ftp_server_username,
            ftp_server_password: ftp_server_data.ftp_server_password
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
        const database_connection = await this.database_connection_manager.getConnection();

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
        const database_connection = await this.database_connection_manager.getConnection();
    
        const new_bot_item_package_document = {
            bot_id: bot_id,
            package_name: bot_package.package_name,
            package_description: bot_package.package_description,
            package_cost: bot_package.package_cost,
            package_items: bot_package.package_items
        };
    
        try {
            const bot_collection = database_connection.collection('bot_packages');
    
            // Use insertOne to add the new bot item package document to the collection
            await bot_collection.insertOne(new_bot_item_package_document);
            console.log("New bot item package inserted successfully.");
    
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot item package: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot item package: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    

    async getBotItemPackageData(bot_id) {
        const database_connection = await this.database_connection_manager.getConnection();
        
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
        const database_connection = await this.database_connection_manager.getConnection();

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
        const database_connection = await this.database_connection_manager.getConnection();
    
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
        const database_connection = await this.database_connection_manager.getConnection();
    
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

    async getAllBotData() {
        const database_connection = await this.database_connection_manager.getConnection();

        try {
            const bot_user_collection = database_connection.collection('bot');
            
            const bot_users = await bot_user_collection.find().toArray();
            
            return bot_users;
        } catch (error) {
            throw new Error(`There was an error when attempting to retrieve all bot user data. Please inform the server administrator of the following error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateBotDataByGuildId(guild_id, new_bot_data) {
        try {
            const database_connection = await this.database_connection_manager.getConnection();
            
            const bot_collection = database_connection.collection('bot');
            const existing_user = await user_collection.findOne({ guild_id: guild_id });
    
            if (!existing_user) {
                throw new Error('The bot user was not found');
            }
    
            /*
            The spread operator merges existing user data with the new data provided as an argument to the function
            */
            const updated_user = { ...existing_user, ...new_bot_data };
    
            /*
            Iterate over the keys of the merged document and remove any fields with undefined values to avoid clearing existing data in the database
            */
            Object.keys(updated_user).forEach(key => {
                if (updated_user[key] === undefined) {
                    delete updated_user[key];
                }
            });
    
            /*
            updateOne used to update a single user document in the database with the merged and filtered data
            */
            await bot_collection.updateOne({ guild_id: guild_id }, { $set: updated_user });
    
            return updated_user;
        } catch (error) {
            throw new Error(`There was an error when attempting to update the bot identified by guild id: ${guild_id}: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    
    async releaseConnectionSafely(database_connection) {
        if (database_connection) {
            try {
                await this.database_connection_manager.releaseConnection(database_connection);
            } catch (error) {
                console.error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
                throw new Error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
            }
        }
    }
}