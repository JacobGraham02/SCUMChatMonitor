export default class Cache {
    data_cache = new Map();

    constructor() {
        if (Cache.instance) {
            return Cache.instance;
        } else {
            Cache.instance = this;
        }
    }

    /**
     * Sets a value in the cache with no expiration time
     * @param {string} key 
     * @param {any} value 
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
        const cache_data = this.data_cache.get(key);
        if (cache_data) {
            return cache_data;
        }
        return undefined;
    }

    /**
     * Deletes a key and value based on the key
     * @param {any} key 
     */
    delete(key) {
        return this.data_cache.delete(key);
    }
}