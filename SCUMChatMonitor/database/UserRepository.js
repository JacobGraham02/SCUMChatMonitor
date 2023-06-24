const DatabaseConnectionManager = require("./DatabaseConnectionManager");

const database_connection_manager = new DatabaseConnectionManager();

module.exports = class UserRepository {

    async findUserById(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
            const user = await user_collection.findOne({ _id: user_steam_id });
            return user;
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
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    } 

    async createUser(user_steam_name, user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('Users');
            const existingUser = await user_collection.findOne({
                $or: [
                    { steam_id: user_steam_id },
                    { steam_name: user_steam_name }
                ]
            });

            if (existingUser) {
                return;
            }
            const new_user_document = {
                user_steam_name: user_steam_name,
                user_steam_id: user_steam_id
            };
            const user_insertion_result = await user_collection.insertOne(new_user_document);
            return user_insertion_result.insertedId;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async updateUser(user_steam_id, user_data) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
            const user_update_result = await user_collection_result.updateOne({ _id: user_steam_id }, { $set: user_data });
            return user_updat_result.modifiedCount > 0;
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async deleteUser(user_steam_id) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const user_collection_result = database_connection.collection('Users');
            const user_deletion_result = await user_collection_result.deleteOne({ _id: user_steam_id });
            return user_deletion_result.deletedCount > 0;
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
