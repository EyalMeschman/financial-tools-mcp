/**
 * Currency type definitions for the financial tools application
 */

export interface Currency {
  /** ISO 4217 currency code (e.g., "USD", "EUR", "GBP") */
  code: string;
  /** Full currency name (e.g., "United States Dollar") */
  name: string;
  /** Optional currency symbol (e.g., "$", "€", "£") */
  symbol?: string;
}

/**
 * Raw currency data format as received from the API
 */
export interface RawCurrencyData {
  code: string;
  name: string;
  symbol?: string;
  [key: string]: any; // Allow additional properties from API
}

/**
 * Error thrown when currency fetch operations fail
 */
export class CurrencyFetchError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'CurrencyFetchError';
  }
}

/**
 * Cache entry for currency data
 */
export interface CurrencyCacheEntry {
  data: Currency[];
  timestamp: number;
  ttl: number;
}