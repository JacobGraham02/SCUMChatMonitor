
module.exports = class PlayerInfoCommand {

    setPlayerIpAddress(ipv4_address) {
        this.player_ip_address = ipv4_address;
    }

    async fetchJsonApiDataFromIpApiDotCom() {
       const response = await fetch(`http://ip-api.com/json/${this.player_ip_address}`);
       const player_info = await response.json();
       return player_info;
    };
}