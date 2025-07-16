/**
 * Simple cache implementation using localStorage with TTL support
 */

/**
 * Gets cached data if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
export function getCached(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) {
      return null;
    }

    const parsedItem = JSON.parse(cachedItem);
    
    // Check if item has expired
    if (parsedItem.expiry && Date.now() > parsedItem.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return parsedItem.data;
  } catch (error) {
    console.error('Error retrieving cached data:', error);
    return null;
  }
}

/**
 * Sets cached data with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttlSeconds - Time to live in seconds
 */
export function setCached(key, data, ttlSeconds) {
  try {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    
    const cacheItem = {
      data,
      expiry,
      timestamp: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error setting cached data:', error);
  }
}

/**
 * Clears a specific cache entry
 * @param {string} key - Cache key to clear
 */
export function clearCached(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cached data:', error);
  }
}

/**
 * Clears all cache entries (useful for testing)
 */
export function clearAllCache() {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing all cached data:', error);
  }
}