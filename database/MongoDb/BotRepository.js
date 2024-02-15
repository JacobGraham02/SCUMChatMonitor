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
        } finally {
            await this.releaseConnectionSafely(database_connection);
        }
    }

    async createBot(bot_information) {
        const database_connection = await database_connection_manager.getConnection();
        try {
            const bot_collection = database_connection.collection('bot');

            const new_bot_document = {
                bot_username: bot_information.bot_username,
                bot_password: bot_information.bot_password,
                bot_email: bot_information.bot_email,
                bot_id: bot_information.bot_id
            };

            await bot_collection.updateOne(
                { bot_id: bot_information.bot_id },
                { $setOnInsert: new_bot_document },
                { upsert: true}
            );
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