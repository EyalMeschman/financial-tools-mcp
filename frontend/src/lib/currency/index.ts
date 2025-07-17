/**
 * Currency library exports
 * 
 * This module provides utilities for fetching, caching, and managing currency data
 * in the financial tools application.
 */

// Types
export { CurrencyFetchError } from './types';

// Schemas and Types
export {
  RawCurrencySchema,
  CurrencySchema,
  RawCurrencyArraySchema,
  CurrencyArraySchema,
  CurrencyCacheEntrySchema,
  type Currency,
  type RawCurrencyData,
  type CurrencyCacheEntry,
} from './schema';

// Fetch utilities
export {
  fetchCurrencies,
  clearCurrencyCache,
  getCurrencyCacheInfo,
} from './fetchCurrencies';