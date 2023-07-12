require('dotenv').config({ path: '../.env' })
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createPool } = require('generic-pool');

module.exports = class DatabaseConnectionManager {
    database_url = process.env.mongodb_connection_string;
    database_connection_pool_size = 10;
    database_name = process.env.mongodb_database_name;
    database_collection = 'Users';
    pool = null;
    change_stream_for_welcome_pack_cost = null;

    constructor() {
        this.initializeDatabaseConnectionPool();
        this.initializeChangeStreamForWelcomePackCost();
    }

    async initializeChangeStreamForWelcomePackCost() {
        this.change_stream_for_welcome_pack_cost = new MongoClient(this.database_url, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        await this.change_stream_for_welcome_pack_cost.connect();
        const database = this.change_stream_for_welcome_pack_cost.db(this.database_name);
        const collection = database.collection(this.database_collection);
        const change_stream_for_users_collection = collection.watch();

        change_stream_for_users_collection.on("change", async (change) => {
            if (change.operationType === 'update' && 'user_welcome_pack_uses' in change.updateDescription.updatedFields) {
                const connection = await this.getConnection();
                const filter = { _id: change.documentKey._id };
                const updated_welcome_pack_cost_document = { $inc: { user_welcome_pack_cost: 5000 } };
                await connection.collection(this.database_collection).updateOne(filter, updated_welcome_pack_cost_document);
                this.releaseConnection(connection);
            }
        });
    }

    async initializeDatabaseConnectionPool() {
        const poolFactory = {
            create: async () => {
                const client = new MongoClient(this.database_url, {
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                    }
                });
                await client.connect();
                return client.db(this.database_name)
            },
            destroy: async (database_instance) => {
                await database_instance.close();
            },
        };
        this.pool = createPool(poolFactory, { max: this.database_connection_pool_size });
    }

    /*
    * this.pool.acquire() function is available in the module generic-pool
    */
    async getConnection() {
        if (!this.pool) {
            await this.initializeDatabaseConnectionPool();
        }
        return this.pool.acquire();
    }

    /*
    * this.pool.release() function is available in the module generic-pool
    */
    async releaseConnection(connection) {
        this.pool.release(connection);
    }
}

