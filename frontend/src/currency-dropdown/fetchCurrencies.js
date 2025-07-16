export class CurrencyFetchError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'CurrencyFetchError';
    this.cause = cause;
  }
}

export async function fetchCurrencies(url, { timeoutMs = 5000 } = {}) {
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
    if (Array.isArray(data)) {
      return data.map(item => ({
        code: item.code,
        name: item.name
      }));
    } else {
      // Handle object format like { "USD": { "name": "US Dollar" }, ... }
      return Object.entries(data).map(([code, currencyData]) => ({
        code,
        name: currencyData.name
      }));
    }

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
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