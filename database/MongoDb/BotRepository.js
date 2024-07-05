import { randomUUID } from 'crypto';
import DatabaseConnectionManager from './DatabaseConnectionManager.js';
import dotenv from 'dotenv';
dotenv.config();

export default class BotRepository {

    constructor(websocket_id, user_email) {
        const database_name = `ScumChatMonitor_${websocket_id}`; 
        this.websocket_id = websocket_id;
        this.user_email = user_email;
        this.database_connection_manager = new DatabaseConnectionManager(database_name);
    }

    async findBotByUUID(bot_uuid) {
        const database_connection = await this.database_connection_manager.getConnection();
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
            command_prefix: teleport_command.command_prefix,
            x_coordinate: teleport_command.x_coordinate,
            y_coordinate: teleport_command.y_coordinate,
            z_coordinate: teleport_command.z_coordinate
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

    async createBotItemPackage(bot_package) {
        const database_connection = await this.database_connection_manager.getConnection();
    
        const new_bot_item_package_document = {
            package_name: bot_package.package_name,
            package_description: bot_package.package_description,
            package_cost: bot_package.package_cost,
            package_items: bot_package.package_items
        };

        console.log(new_bot_item_package_document);
    
        try {
            const bot_collection = database_connection.collection('bot_packages');
    
            // Use insertOne to add the new bot item package document to the collection
            await bot_collection.insertOne(new_bot_item_package_document);
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot item package: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot item package: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }
    

    async getBotItemPackagesData() {
        const database_connection = await this.database_connection_manager.getConnection();
        
        try {
            const bot_packages_collection = database_connection.collection('bot_packages');

            const bot_packages = await bot_packages_collection.find().toArray();
            
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

    async getBotDataByGuildId() {
        const database_connection = await this.database_connection_manager.getConnection();
    
        try {
            const bot_collection = database_connection.collection('bot');
    
            const bot_data = await bot_collection.findOne({});
    
            return bot_data;
        } catch (error) {
            console.error(`There was an error when attempting to retrieve the bot data by guild id. Please inform the server administrator of this error: ${error}`);
            throw new Error(`There was an error when attempting to retrieve the bot data by guild id. Please inform the server administrator of this error: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async getBotUserByEmail(email) {
        const database_connection = await this.database_connection_manager.getMongoDbClientConnection();

        try {
            const admin_database = database_connection.db().admin()
            const list_of_databases = await admin_database.listDatabases();

            for (let databaseInfo of list_of_databases.databases) {
                const database_name = databaseInfo.name;
                const database = database_connection.db(database_name);
                const collection = database.collection('bot')
                const user = await collection.findOne({ bot_email: email});

                if (user) {
                    return user;
                }
            }
        } catch (error) {
            console.error(`There was an error when attempting to find a user associated by email: ${error}`);
            throw new Error(`There was an error when attempting to find a user associated by email: ${error}`);
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

    async createUser(user_steam_name, user_steam_id) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection(`users`);
    
            const new_user_document = {
                user_steam_name: user_steam_name,
                user_steam_id: user_steam_id,
                user_welcome_pack_uses: 0,
                user_welcome_pack_cost: 0,
                user_joining_server_first_time: 0,
                user_money: 0
            };
    
            // Use updateOne with $setOnInsert and upsert: true to ensure only new users are added
            await user_collection.updateOne(
                { user_steam_id: user_steam_id },
                { $setOnInsert: new_user_document },
                { upsert: true }
            );
    
        } catch (error) {
            console.error(`Error creating user: ${error}`);
            throw new Error(`Error creating user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateAllUsersWithJoinedServerValueOne() {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_update_result = await user_collection_result.updateMany({}, { $set: { user_joining_server_first_time: 1 } });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating all users: ${error}`);
            throw new Error(`Error updating all users: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUserWelcomePackUsesByOne(user_steam_id) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $inc: { user_welcome_pack_uses: 1 } });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating user welcome pack uses: ${error}`);
            throw new Error(`Error updating user welcome pack uses: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async findUserById(user_steam_id) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('users');
            const user = await user_collection.findOne({ user_steam_id: user_steam_id });
            return user;
        } catch (error) {
            console.error(`Error finding user by ID: ${error}`);
            throw new Error(`Error finding user by ID: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async findUserByIdIfFirstServerJoin(user_steam_id) { 
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('users');
            const user = await user_collection.findOne({
                user_steam_id: user_steam_id,
                user_joining_server_first_time: 0
            });
            return user;
        } catch (error) {
            console.error(`Error finding user by ID if first server join: ${error}`);
            throw new Error(`Error finding user by ID if first server join: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async findAllUsers() {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('users');
            const users = await user_collection.find({}).toArray();
            return users;
        } catch (error) {
            console.error(`Error finding all users: ${error}`);
            throw new Error(`Error finding all users: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    } 

    async deleteBotPackageByName(package_name) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const deletion_result = await database_connection.collection('bot_packages').deleteOne({ package_name: package_name });
            return deletion_result;
        } catch (error) {
            console.error(`There was an error when attempting to delete the command: ${error}`);
            throw error;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUser(user_steam_id, user_data) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $set: user_data });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating user: ${error}`);
            throw new Error(`Error updating user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUserAccountBalance(user_steam_id, user_account_update_value) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection(`users`);
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $inc: { user_money: user_account_update_value } });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating user account balance: ${error}`);
            throw new Error(`Error updating user account balance: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async deleteUser(user_steam_id) {
        const database_connection = await this.database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_deletion_result = await user_collection_result.deleteOne({ user_steam_id: user_steam_id });
            return user_deletion_result.deletedCount > 0;
        } catch (error) {
            console.error(`Error deleting user: ${error}`);
            throw new Error(`Error deleting user: ${error}`);
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