require('dotenv').config({ path: '../.env' })
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createPool } = require('generic-pool');

module.exports = class DatabaseConnectionManager {
    database_url = process.env.mongodb_connection_string;
    database_connection_pool_size = 10;
    database_name = process.env.mongodb_database_name;
    pool = null;

    constructor() {
        this.initializeDatabaseConnectionPool();
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
                return client.db(this.data)
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

