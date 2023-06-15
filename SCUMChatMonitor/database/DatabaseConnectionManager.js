var mysql = require('mysql2');
require('dotenv').config({path: '../.env'})

module.exports = class DatabaseConnectionManager {
    database_connection_limit = 10;
    database_host = process.env.database_host;
    database_user = process.env.database_user;
    database_password = process.env.database_password;
    database_name = process.env.database_name;
    database_port = process.env.database_port;

    initializeDatabaseConnectionPool() {
        return mysql.createPool({
            connection_limit: this.database_connection_limit,
            host: database_host,
            port: database_port,
            user: database_user,
            password: database_password,
            database: database_name
        });
    };

}