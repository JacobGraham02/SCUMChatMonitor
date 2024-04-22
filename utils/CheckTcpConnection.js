import { exec } from 'child_process';
export default class CheckTcpConnection {

    game_server_address;
    game_server_port;

    constructor(game_server_remote_address, game_server_remote_port) {
        this.game_server_address = game_server_remote_address;
        this.game_server_port = game_server_remote_port;
    };

    /**
     * This function uses the native Windows command prompt shell to execute the command 'netstat -an' to fetch a list of current connections.
     * It checks if the computer is connected to the game server IP address, which helps ensure the bot keeps trying to rejoin the game server if disconnected.
     * The function now returns a Promise that resolves to true if connected, or false otherwise.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the connection status.
     */
    checkWindowsHasTcpConnectionToGameServer(game_server_address, game_server_port) {
        return new Promise((resolve, reject) => {
            exec('netstat -an', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                const target_connection_string = `${this.game_server_address}:${this.game_server_port}`;
                const target_connection_string_regex = new RegExp(target_connection_string);
                resolve(target_connection_string_regex.test(stdout));
            });
        });
    }

    /**
     * This function uses the native Windows command prompt shell to execute a 'ping' command that will test to see if the game server is in an operational state.
     * Because the game server restarts every day at approximately 18:00, we must ping the server to see if the server is online before doing anything on the server. 
     * @param {boolean} callback 
     */
    checkWindowsCanPingGameServer(game_server_address, game_server_port) {
        return new Promise((resolve, reject) => {
            exec(`ping ${this.game_server_address}`, (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }
                const target_ping_reply_string = `Reply from ${this.game_server_address}:`;
                if (stdout.includes(target_ping_reply_string)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    };
}
