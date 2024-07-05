import { config } from 'dotenv';
config({ path: '.env' });
import { MongoClient, ServerApiVersion } from 'mongodb';
import { createPool } from 'generic-pool';

export default class DatabaseConnectionManager {
    database_url = process.env.mongodb_connection_string;
    database_connection_pool_size = 10;
    users_database_collection = 'users';
    bot_database_collection = 'bot';
    bot_packages_database_collection = 'bot_packages';
    pool = null;
    change_stream_for_welcome_pack_cost = null;
    mongodb_client = undefined;

    constructor(database_name) {
        this.database_name = database_name;
        this.initializeDatabaseConnectionPool();
    }

    async initializeDatabaseConnectionPool() {
        const poolFactory = {
            create: async () => {
                this.mongodb_client = new MongoClient(this.database_url, {
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                    }
                });
                await this.mongodb_client.connect();
                return this.mongodb_client.db(this.database_name);
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

    async getMongoDbClientConnection() {
        if (!this.mongodb_client) {
            this.mongodb_client = new MongoClient(this.database_url, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                }
            });
            await this.mongodb_client.connect();
        }
        return this.mongodb_client;
    }

    /*
    * this.pool.release() function is available in the module generic-pool
    */
    async releaseConnection(connection) {
        if (connection && this.pool) {
            await this.pool.release(connection);
        } else if (connection) {
            await connection.close();
        }
    }
}