/**
 * Simple cache implementation using localStorage with TTL support
 */

interface CacheItem {
  data: any;
  expiry: number | null;
  timestamp: number;
}

/**
 * Gets cached data if it exists and hasn't expired
 */
export function getCached(key: string): any | null {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) {
      return null;
    }

    const parsedItem: CacheItem = JSON.parse(cachedItem);
    
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
 */
export function setCached(key: string, data: any, ttlSeconds?: number): void {
  try {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    
    const cacheItem: CacheItem = {
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
 */
export function clearCached(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cached data:', error);
  }
}

/**
 * Clears all cache entries (useful for testing)
 */
export function clearAllCache(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing all cached data:', error);
  }
}