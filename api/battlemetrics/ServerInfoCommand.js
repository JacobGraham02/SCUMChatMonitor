export default class ServerInfoCommand {

    constructor(battlemetrics_server_id) {
        this.battlemetrics_id = battlemetrics_server_id;
    }

    async fetchJsonApiDataFromBattlemetrics() {
        const response = await fetch(`https://api.battlemetrics.com/servers/${this.battlemetrics_id}`);
        const battlemetrics_server_info = await response.json();
        return battlemetrics_server_info;
    }
}