import { exec } from 'child_process';
export default class CheckTcpConnection {

    game_server_address;
    game_server_port;

    constructor(game_server_remote_address, game_server_remote_port) {
        this.game_server_address = game_server_remote_address;
        this.game_server_port = game_server_remote_port;
    };

    /**
     * This function uses the native Windows command prompt shell to execute the command 'netstat -an' to fetch a list of current connections, and returns if the 
     * computer is connected to the game server ip address. This is done as a natural way to ensure the bot keeps attempting to rejoin the game server if kicked off for any reason. 
     * @param {boolean} callback 
     */
    checkWindowsHasTcpConnectionToGameServer(callback) {
        exec('netstat -an', (error, stdout, stderr) => {
            const target_connection_string = `${this.game_server_address}:${this.game_server_port}`;
            const target_connection_string_regex = new RegExp(target_connection_string);
            if (target_connection_string_regex.test(stdout)) {
                callback(true);
            } else {
                callback(false);
            }
        });
    };

    /**
     * This function uses the native Windows command prompt shell to execute a 'ping' command that will test to see if the game server is in an operational state.
     * Because the game server restarts every day at approximately 18:00, we must ping the server to see if the server is online before doing anything on the server. 
     * @param {boolean} callback 
     */
    checkWindowsCanPingGameServer(callback) {
        exec(`ping ${this.game_server_address}`, (error, stdout, stderr) => {
            const target_ping_reply_string = `Reply from ${this.game_server_address}:`;
            const target_ping_reply_string_regex = new RegExp(target_ping_reply_string);
            if (target_ping_reply_string_regex.test(stdout)) {
                callback(true);
            } else {
                callback(false);
            }
        });
    };
}
