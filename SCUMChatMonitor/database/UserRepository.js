const DatabaseConnectionManager = require('./IUserRepository');
module.exports = class IUserRepository {

    constructor(database_connection_pool) {
        this.connection_manager = new DatabaseConnectionManager()
        this.db_connection_pool = this.connection_manager.initializeDatabaseConnectionPool();
    }

    async findUserById(user_id) {
        const database_connection = await this.connection_manager.getConnection();
        try {
            const user_collection = database_connection.collection('users');
            const user = await user_collection.findOne({ _id: user_id });
            return user;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async findAllUsers() {
        const database_connection = await this.db_connection_pool.getConnection();
        try {
            const user_collection = database_connection.collection('users');
            const users = await user_collection.find({}).toArray();
            return users;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async createUser(user_data) {
        const database_connection = await this.db_connection_pool.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_insertion_result = await user_collection_result.insertOne(user_data);
            return user_insertion_result.insertedId;
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async updateUser(user_id, user_data) {
        const database_connection = await this.db_connection_pool.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_update_result = await user_collection_result.updateOne({ _id: user_id }, { $set: user_data });
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }

    async deleteUser(user_id) {
        const database_connection = await this.db_connection_pool.getConnection();
        try {
            const user_collection_result = database_connection.collection('users');
            const user_deletion_result = await user_collection_result.deleteOne({ _id: user_id });
        } finally {
            this.connection_manager.releaseConnection(database_connection);
        }
    }
}