const { exec } = require('child_process');
module.exports = class CheckTcpConnection {

    constructor(remote_address, remote_port) {
        this.remote_address = remote_address;
        this.remote_port = remote_port;
        this.address = '';
        this.port = 0;
    }

    checkWindowsHasTcpConnectionToGameServer(callback) {
        exec('netstat -an', (err, stdout, stderr) => {
            if (err) {
                console.error('There was an error when attempting to look for the game server remote IP address and port');
                callback(false);
                return;
            }
            const target_connection_string = `${this.remote_address}:${this.remote_port}`;
            const netstat_connections = stdout.split('\n');
            const filtered_connection_lines = netstat_connections.filter(line => line.includes(target_connection_string));
            callback(filtered_connection_lines.length>=1)
        });
    }
}
