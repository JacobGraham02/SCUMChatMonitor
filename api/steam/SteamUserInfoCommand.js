import { config } from 'dotenv';
config({ path: '.env' });


export default class ServerInfoCommand {

    constructor(steam_api_key) {
        this.steam_web_api_key = steam_api_key;
    }

    setPlayerSteamId(steam_id) {
        this.player_steam_id = steam_id;
    }

    async fetchJsonApiDataFromSteamWebApi() {
        try {
            console.log(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.steam_web_api_key}&steamids=${this.player_steam_id}&format=json`);
            const response = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.steam_web_api_key}&steamids=${this.player_steam_id}&format=json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text(); 
            try {
                const data = JSON.parse(text); 
                return data;
            } catch (error) {
                console.error("Failed to parse JSON:", text);
                throw error; 
            }
        } catch (error) {
            console.error("Fetch error:", error.message);
            throw error; 
        }
    }
}