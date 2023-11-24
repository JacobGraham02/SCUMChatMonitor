const { exec } = require('child_process');
module.exports = class CheckTcpConnection {

    constructor(game_server_remote_address, game_server_remote_port) {
        this.game_server_address = game_server_remote_address;
        this.game_server_port = game_server_remote_port;
        this.address = '';
        this.port = 0;
    };

    /**
     * This function uses the native Windows command prompt shell to execute the command 'netstat -an' to fetch a list of current connections, and returns if the 
     * computer is connected to the game server ip address. This is done as a natural way to ensure the bot keeps attempting to rejoin the game server if kicked off for any reason. 
     * @param {boolean} callback 
     */
    checkWindowsHasTcpConnectionToGameServer(callback) {
        exec('netstat -an', (error, stdout, stderr) => {
            if (error) {
                console.error(`There was an error when attempting to look for the game server IP address and port from netstat list. Error: ${stderr}`);
                callback(false);
                return;
            }
            const target_connection_string = `${this.game_server_address}:${this.game_server_port}`;
            const netstat_connections = stdout.split('\n');
            const filtered_connection_lines = netstat_connections.filter(line => line.trim().includes(target_connection_string));
            callback(filtered_connection_lines.length>=1);
        });
    };

    /**
     * This function uses the native Windows command prompt shell to execute a 'ping' command that will test to see if the game server is in an operational state.
     * Because the game server restarts every day at approximately 18:00, we must ping the server to see if the server is online before doing anything on the server. 
     * @param {boolean} callback 
     */
    // checkWindowsCanPingGameServer(callback) {
    //     exec(`ping ${this.game_server_address}`, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`There was an error when attempting to ping the game server IP address. Error: ${stderr}`);
    //             callback(false);
    //             return;
    //         }
    //         const target_result_string_substring = `Reply from ${this.remote_address}:`;
    //         const ping_responses = stdout.split('\n');
    //         const filtered_ping_responses = ping_responses.filter(line => line.includes(target_result_string_substring));
    //         callback(filtered_ping_responses.length>1);
    //     });
    // };
}
