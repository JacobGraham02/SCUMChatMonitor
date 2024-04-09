export default class Cache {
    data_cache = new Map();

    constructor() {
        if (Cache.instance) {
            return Logger.instance;
        } else {
            Cache.instance = this;
        }
    }

    /**
     * Sets a value in the cache with no expiration time
     * @param {string} key 
     * @param {string} value 
     */
    set(key, value) {
        this.data_cache.set(key, value);
    }

    /**
     * Gets the value from a given key
     * @param {string} key 
     * @returns the guild id of a user, or undefined if one does not exist
     */
    get(key) {
        const guild_id = this.data_cache.get(key);
        if (guild_id) {
            return guild_id;
        }
        return undefined;
    }
}