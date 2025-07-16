import { getCached, setCached } from '../cache';

export class CurrencyFetchError extends Error {
  public cause?: unknown;
  
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'CurrencyFetchError';
    this.cause = cause;
  }
}

export interface CurrencyData {
  code: string;
  name: string;
}

interface RawCurrencyItem {
  code: string;
  name: string;
}

interface RawCurrencyObject {
  [key: string]: {
    name: string;
  };
}

export async function fetchCurrencies(url: string, { timeoutMs = 5000 }: { timeoutMs?: number } = {}): Promise<CurrencyData[]> {
  const cacheKey = 'currencies_v1';
  const cacheTtl = 86400; // 24 hours in seconds
  
  // Try to get from cache first
  const cachedData = getCached<CurrencyData[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // If not in cache, fetch from network
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new CurrencyFetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response
      );
    }

    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      throw new CurrencyFetchError('Response is not a valid object', data);
    }

    // Handle both array and object formats
    let processedData: CurrencyData[];
    if (Array.isArray(data)) {
      processedData = (data as RawCurrencyItem[]).map((item) => ({
        code: item.code,
        name: item.name
      }));
    } else {
      // Handle object format like { "USD": { "name": "US Dollar" }, ... }
      const objData = data as RawCurrencyObject;
      processedData = Object.entries(objData).map(([code, currencyData]) => ({
        code,
        name: currencyData.name
      }));
    }

    // Cache the processed data
    setCached(cacheKey, processedData, cacheTtl);
    
    return processedData;

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CurrencyFetchError(`Request timed out after ${timeoutMs}ms`, error);
    }
    
    if (error instanceof CurrencyFetchError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new CurrencyFetchError('Invalid JSON response', error);
    }
    
    throw new CurrencyFetchError('Network error', error);
  }
}