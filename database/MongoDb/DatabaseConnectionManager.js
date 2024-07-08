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
    mongo_client_database_instances_pool = null;
    mongo_client_instances_pool = null;
    change_stream_for_welcome_pack_cost = null;
    mongodb_database_client = undefined;
    mongodb_client = undefined;

    constructor(database_name) {
        this.database_name = database_name;
        this.initializeMongodbDatabaseInstanceConnectionPool();
        this.initializeMongoClientConnectionPool();
    }

    async initializeMongodbDatabaseInstanceConnectionPool() {
        const mongo_database_instance_pool = {
            create: async () => {
                this.mongodb_database_client = new MongoClient(this.database_url, {
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                    }
                });
                await this.mongodb_database_client.connect();
                return this.mongodb_database_client.db(this.database_name);
            },
            destroy: async (database_instance) => {
                await database_instance.close();
            },
        };
        this.mongo_client_database_instances_pool = createPool(mongo_database_instance_pool, { max: this.database_connection_pool_size });
    }

    async initializeMongoClientConnectionPool() {
        const mongo_client_instance_pool = {
            create: async () => {
                this.mongodb_client = new MongoClient(this.database_url, {
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                    }
                });
                await this.mongodb_client.connect();
                return this.mongodb_client;
            },
            destroy: async (mongo_client_instance) => {
                await mongo_client_instance.close();
            }
        };
        this.mongo_client_instances_pool = createPool(mongo_client_instance_pool, { max: this.database_connection_pool_size });
    }

    async getMongoClient() {
        return await this.database_connection_manager.getMongoDbClientConnection();
    }

    /*
    * this.pool.acquire() function is available in the module generic-pool
    */
    async getConnection() {
        if (!this.mongo_client_database_instances_pool) {
            await this.initializeMongodbDatabaseInstanceConnectionPool();
        }
        return this.mongo_client_database_instances_pool.acquire();
    }

    async getMongoClientConnection() {
        if (!this.mongo_client_instances_pool) {
            await this.initializeMongoClientConnectionPool();
        }
        return this.mongo_client_instances_pool.acquire();
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
        if (connection && this.mongo_client_database_instances_pool) {
            await this.mongo_client_database_instances_pool.release(connection);
        } else if (connection) {
            await connection.close();
        }
    }

    async releaseMongoClientConnection(connection) {
        if (connection && this.mongo_client_instances_pool) {
            await this.mongo_client_instances_pool.release(connection);
        } else if (connection) {
            await connection.close();
        }
    }
}