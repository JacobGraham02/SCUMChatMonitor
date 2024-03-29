const crypto = require('crypto');
const DatabaseConnectionManager = require("./DatabaseConnectionManager");

const database_connection_manager = new DatabaseConnectionManager();

module.exports = class UserRepository {

    async findUserById(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
            const user = await user_collection.findOne({ user_steam_id: user_steam_id });
            return user;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw new Error('Failed to find user by ID');
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
            console.error('Error finding user by ID if first server join:', error);
            throw new Error('Failed to find user by ID if first server join');
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
            console.error('Error finding all users:', error);
            throw new Error('Failed to find all users');
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
            console.error('Error finding admin by username:', error);
            throw new Error('Failed to find admin by username');
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
            console.error('Error finding admin by UUID:', error);
            throw new Error('Failed to find admin by UUID');
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createAdminUser(admin_username, admin_password, admin_bot_token) {
        const database_connection = await database_connection_manager.getConnection();

        try {
            const user_collection = database_connection.collection('Administrators');

            const new_admin_user_document = {
                admin_id: crypto.randomUUID(),
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
            console.error('Error creating admin user:', error);
            throw new Error('Failed to create admin user');
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createUser(user_steam_name, user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');

            const new_user_document = {
                user_steam_name: user_steam_name,
                user_steam_id: user_steam_id,
                user_welcome_pack_uses: 0,
                user_welcome_pack_cost: 0,
                user_joining_server_first_time: 0,
                user_money: 0
            };

            await user_collection.updateOne(
                { user_steam_id: user_steam_id },
                { $setOnInsert: new_user_document },
                { upsert: true }  
            );

        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Failed to create user');
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
            console.error('Error updating user:', error);
            throw new Error('Failed to update user');
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
            console.error('Error updating all users:', error);
            throw new Error('Failed to update all users');
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
            console.error('Error updating user welcome pack uses:', error);
            throw new Error('Failed to update user welcome pack uses');
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUserAccountBalance(user_steam_id, user_account_update_value) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
            const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $inc: { user_money: user_account_update_value } });
            return user_update_result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating user account balance:', error);
            throw new Error('Failed to update user account balance');
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
            console.error('Error deleting user:', error);
            throw new Error('Failed to delete user');
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
            }
        }
    }
}
