import { randomUUID } from 'crypto';
import DatabaseConnectionManager from "./DatabaseConnectionManager.js";
import { hashPassword } from '../../modules/hashAndValidatePassword.js';

const database_connection_manager = new DatabaseConnectionManager();

export default class UserRepository {

    async findUserById(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
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
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
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
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
            const users = await user_collection.find({}).toArray();
            return users;
        } catch (error) {
            console.error(`Error finding all users: ${error}`);
            throw new Error(`Error finding all users: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    } 

    async findAdminByUsername(admin_username) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Administrators');
            const user = await user_collection.findOne({ admin_username: admin_username });
            return user;
        } catch (error) {
            console.error(`Error finding admin by username: ${error}`);
            throw new Error(`Error finding admin by username: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async findAdminByUuid(admin_uuid) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Administrators');
            const user = await user_collection.findOne({ admin_id: admin_uuid });
            return user;
        } catch (error) {
            console.error(`Error finding admin by UUID: ${error}`);
            throw new Error(`Error finding admin by UUID: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBotWebsiteUser(user_username, user_email, user_password, discord_guild_id) {
        const database_connection = await database_connection_manager.getConnection();

        try {
            const user_collection = database_connection.collection(`BotOwners`);
            const bot_owner_password = hashPassword(user_password).hash;

            const new_bot_user_document = {
                bot_user_id: randomUUID(),
                bot_user_guild_id: discord_guild_id,
                bot_user_email: user_email,
                bot_user_username: user_username,
                bot_user_password: bot_owner_password,
            };

            const newBotUserResult = await user_collection.insertOne(new_bot_user_document);
            return newBotUserResult.insertedId;
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot website user: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot website user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateBotWebsiteUserChannelIds(user_id, discord_channel_ids) {
        const database_connection = await database_connection_manager.getConnection();

        try {
            const user_collection = database_connection.collection(`BotOwners`);

            const filter = { bot_user_id: user_id }

            const update_bot_user_document = {
                $set: {
                    discord_guild_id: discord_guild_id,
                    discord_server_admin_log_channel_id: discord_channel_ids.admin_channel_id,
                    discord_chat_log_channel_id: discord_channel_ids.chat_channel_id,
                    discord_login_log_channel_id: discord_channel_ids.log_channel_id
                }
            }

            const updateChannelIdsResult = await user_collection.updateOne(filter, update_bot_user_document);

            return updateChannelIdsResult.matchedCount > 0 ? updateChannelIdsResult.modifiedCount : `No documents were updated with the new Discord channel ids. Please contact the server administrator`;
        } catch (error) {
            console.error(`There was an error when attempting to create a new bot website user: ${error}`);
            throw new Error(`There was an error when attempting to create a new bot website user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createAdminUser(admin_username, admin_password, admin_bot_token) {
        const database_connection = await database_connection_manager.getConnection();

        try {
            const user_collection = database_connection.collection('Administrators');

            const new_admin_user_document = {
                admin_id: randomUUID(),
                admin_username: admin_username,
                admin_password_hash: admin_password.salt + admin_password.hash,
                admin_password_salt: admin_password.salt,
                admin_bot_token: admin_bot_token
            };

            await user_collection.updateOne(
                { admin_username: admin_username },
                { $setOnInsert: new_admin_user_document },
                { upsert: true }
            );

        } catch (error) {
            console.error(`Error creating admin user: ${error}`);
            throw new Error(`Error creating admin user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createUser(user_steam_name, user_steam_id, guild_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection(`users_${guild_id}`);
    
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

    async updateUser(user_steam_id, user_data) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $set: user_data });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating user: ${error}`);
            throw new Error(`Error updating user: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateAllUsersWithJoinedServerValueOne() {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
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
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $inc: { user_welcome_pack_uses: 1 } });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error(`Error updating user welcome pack uses: ${error}`);
            throw new Error(`Error updating user welcome pack uses: ${error}`);
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUserAccountBalance(user_steam_id, user_account_update_value, guild_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection(`${guild_id}_users`);
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
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
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
                await database_connection_manager.releaseConnection(database_connection);
            } catch (error) {
                console.error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
                throw new Error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
            }
        }
    }
}
