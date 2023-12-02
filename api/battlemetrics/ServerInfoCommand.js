const { exec } = require('child_process');

module.exports = class ServerInfo {

    constructor(battlemetrics_server_id) {
        this.battlemetrics_id = battlemetrics_server_id;
    }

    fetchJsonApiDataFromBattlemetrics(callback) {
        exec('curl -n -X GET https://api.battlemetrics.com/servers/21048997', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${stderr}`);
                callback(false);
                return;
            }
            callback(stdout);
        });
    };
}