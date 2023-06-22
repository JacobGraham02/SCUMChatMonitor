const DatabaseConnectionManager = require("./DatabaseConnectionManager");

module.exports = class UserRepository {
    constructor(database_connection_manager) {
        this.database_connection_manager = new DatabaseConnectionManager();
        this.database_connection_pool = database_connection_manager.initializeDatabaseConnectionPool();
    }

    async findUserById(user_id) {
        try {
            const database_connection = await this.database_connection_pool.getConnection();
            const user_collection = database_connection.collection('users');
            const user = await user_collection.findOne({ _id: user_id });
            return user;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async findAllUsers() {
        try {
            const database_connection = await this.database_connection_pool.getConnection();
            const user_collection = database_connection.collection('users');
            const users = await user_collection.find({}).toArray();
            return users;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async createUser(user_data) {
        try {
            const database_connection = await this.database_connection_pool.getConnection();
            const user_collection_result = database_connection.collection('users');
            const user_insertion_result = await user_collection_result.insertOne(user_data);
            return user_insertion_result.insertedId;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async updateUser(user_id, user_data) {
        try {
            const database_connection = await this.database_connection_pool.getConnection();
            const user_collection_result = database_connection.collection('users');
            const user_update_result = await user_collection_result.updateOne({ _id: user_id }, { $set: user_data });
            return user_updat_result.modifiedCount > 0;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async deleteUser(user_id) {
        try {
            const database_connection = await this.database_connection_pool.getConnection();
            const user_collection_result = database_connection.collection('users');
            const user_deletion_result = await user_collection_result.deleteOne({ _id: user_id });
            return user_deletion_result.deletedCount > 0;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }
}
