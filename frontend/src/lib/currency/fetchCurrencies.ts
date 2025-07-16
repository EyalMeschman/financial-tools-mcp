import { Currency, CurrencyFetchError } from './types';
import { RawCurrencyArraySchema, CurrencyArraySchema, CurrencyCacheEntrySchema } from './schema';

/**
 * Cache key for storing currency data in localStorage
 */
const CURRENCY_CACHE_KEY = 'currency_cache';

/**
 * Default cache TTL: 24 hours in milliseconds
 */
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Default fetch timeout: 5 seconds
 */
const DEFAULT_FETCH_TIMEOUT = 5000;

/**
 * Fetch currencies from the API with caching
 * 
 * @param url - URL to fetch currencies from
 * @param cacheTtl - Cache time-to-live in milliseconds (default: 24 hours)
 * @param fetchTimeout - Fetch timeout in milliseconds (default: 5 seconds)
 * @returns Promise<Currency[]> - Array of currency objects
 * @throws {CurrencyFetchError} - When fetch fails or data is invalid
 */
export async function fetchCurrencies(
  url: string,
  cacheTtl: number = DEFAULT_CACHE_TTL,
  fetchTimeout: number = DEFAULT_FETCH_TIMEOUT
): Promise<Currency[]> {
  // Check cache first
  const cachedData = getCachedCurrencies();
  if (cachedData && isCacheValid(cachedData, cacheTtl)) {
    return cachedData.data;
  }

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

    // Fetch data from API
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new CurrencyFetchError(
        `Failed to fetch currencies: ${response.status} ${response.statusText}`
      );
    }

    const rawData = await response.json();

    // Filter to only include currencies with 3-letter codes before validation
    const filteredRawData = rawData.filter((currency: any) => currency.code?.length === 3);
    
    // Validate filtered data with Zod
    const validatedRawData = RawCurrencyArraySchema.parse(filteredRawData);

    // Transform to internal format
    const currencies: Currency[] = validatedRawData
      .map(currency => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || currency.code, // Use code as fallback symbol
      }));

    // Validate transformed data
    const validatedCurrencies = CurrencyArraySchema.parse(currencies);

    // Cache the result
    setCachedCurrencies(validatedCurrencies, cacheTtl);

    return validatedCurrencies;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new CurrencyFetchError('Request timed out', error);
    }
    
    if (error instanceof CurrencyFetchError) {
      throw error;
    }

    throw new CurrencyFetchError(
      'Failed to fetch or validate currency data',
      error as Error
    );
  }
}

/**
 * Get cached currencies from localStorage
 * 
 * @returns CurrencyCacheEntry | null
 */
function getCachedCurrencies() {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!cached) return null;

    const parsedData = JSON.parse(cached);
    return CurrencyCacheEntrySchema.parse(parsedData);
  } catch (error) {
    // Invalid cache data, remove it
    localStorage.removeItem(CURRENCY_CACHE_KEY);
    return null;
  }
}

/**
 * Check if cache entry is still valid
 * 
 * @param cacheEntry - Cache entry to check
 * @param cacheTtl - Cache time-to-live in milliseconds
 * @returns boolean
 */
function isCacheValid(cacheEntry: any, cacheTtl: number): boolean {
  const now = Date.now();
  const age = now - cacheEntry.timestamp;
  return age < cacheTtl;
}

/**
 * Store currencies in localStorage cache
 * 
 * @param currencies - Array of currency objects to cache
 * @param cacheTtl - Cache time-to-live in milliseconds
 */
function setCachedCurrencies(currencies: Currency[], cacheTtl: number): void {
  try {
    const cacheEntry = {
      data: currencies,
      timestamp: Date.now(),
      ttl: cacheTtl,
    };

    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (error) {
    // localStorage might be full or unavailable - fail silently
    console.warn('Failed to cache currencies:', error);
  }
}

/**
 * Clear cached currencies
 */
export function clearCurrencyCache(): void {
  localStorage.removeItem(CURRENCY_CACHE_KEY);
}

/**
 * Get cache statistics
 * 
 * @returns Cache info or null if no cache exists
 */
export function getCurrencyCacheInfo() {
  const cached = getCachedCurrencies();
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  const remaining = cached.ttl - age;

  return {
    count: cached.data.length,
    age,
    remaining,
    isValid: remaining > 0,
  };
}