import DatabaseConnectionManager from "./DatabaseConnectionManager.js";

const database_connection_manager = new DatabaseConnectionManager();

export default class UserRepository {

    constructor(websocket_id) {
        const database_name = `ScumChatMonitor_${websocket_id}`;
        this.websocket_id = websocket_id;
        this.database_connection_manager = new DatabaseConnectionManager(database_name);
    }

    async findUserById(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
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
        const database_connection = await database_connection_manager.getConnection();
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
        const database_connection = await database_connection_manager.getConnection();
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

    // async updateUserAccountBalance(user_steam_id, user_account_update_value, guild_id) {
    //     const database_connection = await database_connection_manager.getConnection();
    //     try {
    //         const user_collection_result = database_connection.collection(`${guild_id}_users`);
    //         const user_update_result = await user_collection_result.updateOne({ user_steam_id: user_steam_id }, { $inc: { user_money: user_account_update_value } });
    //         return user_update_result.modifiedCount > 0;
    //     } catch (error) {
    //         console.error(`Error updating user account balance: ${error}`);
    //         throw new Error(`Error updating user account balance: ${error}`);
    //     } finally {
    //         await this.releaseConnectionSafely(database_connection);
    //     }
    // }

    async deleteUser(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
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
                await database_connection_manager.releaseConnection(database_connection);
            } catch (error) {
                console.error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
                throw new Error(`An error has occurred during the execution of releaseConnectionSafely function: ${error}`);
            }
        }
    }
}
