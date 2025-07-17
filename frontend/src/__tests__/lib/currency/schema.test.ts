import { describe, it, expect } from '@jest/globals';
import {
  RawCurrencySchema,
  CurrencySchema,
  RawCurrencyArraySchema,
  CurrencyArraySchema,
  CurrencyCacheEntrySchema,
} from '../../../lib/currency/schema';

describe('Currency Schema Validation', () => {
  describe('RawCurrencySchema', () => {
    it('should validate valid currency data', () => {
      const validCurrency = {
        code: 'USD',
        name: 'United States Dollar',
        symbol: '$',
      };

      const result = RawCurrencySchema.safeParse(validCurrency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCurrency);
      }
    });

    it('should validate currency without symbol', () => {
      const validCurrency = {
        code: 'EUR',
        name: 'Euro',
      };

      const result = RawCurrencySchema.safeParse(validCurrency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCurrency);
      }
    });

    it('should reject invalid currency codes', () => {
      const invalidCurrencies = [
        { code: 'US', name: 'United States Dollar' }, // Too short
        { code: 'USDD', name: 'United States Dollar' }, // Too long
        { code: 'usd', name: 'United States Dollar' }, // Lowercase
        { code: 'U$D', name: 'United States Dollar' }, // Invalid characters
        { code: '123', name: 'United States Dollar' }, // Numbers
      ];

      invalidCurrencies.forEach(currency => {
        const result = RawCurrencySchema.safeParse(currency);
        expect(result.success).toBe(false);
      });
    });

    it('should reject missing required fields', () => {
      const invalidCurrencies = [
        { name: 'United States Dollar' }, // Missing code
        { code: 'USD' }, // Missing name
        { code: 'USD', name: '' }, // Empty name
      ];

      invalidCurrencies.forEach(currency => {
        const result = RawCurrencySchema.safeParse(currency);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CurrencySchema', () => {
    it('should validate processed currency data', () => {
      const validCurrency = {
        code: 'GBP',
        name: 'British Pound Sterling',
        symbol: '£',
      };

      const result = CurrencySchema.safeParse(validCurrency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCurrency);
      }
    });

    it('should have same validation rules as RawCurrencySchema', () => {
      const testCurrency = {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
      };

      const rawResult = RawCurrencySchema.safeParse(testCurrency);
      const processedResult = CurrencySchema.safeParse(testCurrency);

      expect(rawResult.success).toBe(processedResult.success);
    });
  });

  describe('RawCurrencyArraySchema', () => {
    it('should validate array of valid currencies', () => {
      const validCurrencies = [
        { code: 'USD', name: 'United States Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
      ];

      const result = RawCurrencyArraySchema.safeParse(validCurrencies);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCurrencies);
      }
    });

    it('should reject array with invalid currencies', () => {
      const invalidCurrencies = [
        { code: 'USD', name: 'United States Dollar' },
        { code: 'INVALID', name: 'Invalid Currency' }, // Invalid code
        { code: 'GBP', name: 'British Pound Sterling' },
      ];

      const result = RawCurrencyArraySchema.safeParse(invalidCurrencies);
      expect(result.success).toBe(false);
    });

    it('should validate empty array', () => {
      const result = RawCurrencyArraySchema.safeParse([]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('CurrencyArraySchema', () => {
    it('should validate array of processed currencies', () => {
      const validCurrencies = [
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
      ];

      const result = CurrencyArraySchema.safeParse(validCurrencies);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCurrencies);
      }
    });
  });

  describe('CurrencyCacheEntrySchema', () => {
    it('should validate valid cache entry', () => {
      const validCacheEntry = {
        data: [
          { code: 'USD', name: 'United States Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
        ],
        timestamp: Date.now(),
        ttl: 86400000, // 24 hours
      };

      const result = CurrencyCacheEntrySchema.safeParse(validCacheEntry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCacheEntry);
      }
    });

    it('should reject invalid cache entry', () => {
      const invalidCacheEntries = [
        { data: [], timestamp: Date.now() }, // Missing TTL
        { data: [], ttl: 86400000 }, // Missing timestamp
        { timestamp: Date.now(), ttl: 86400000 }, // Missing data
        { data: [{ invalid: 'currency' }], timestamp: Date.now(), ttl: 86400000 }, // Invalid currency data
      ];

      invalidCacheEntries.forEach(entry => {
        const result = CurrencyCacheEntrySchema.safeParse(entry);
        expect(result.success).toBe(false);
      });
    });

    it('should reject invalid data types', () => {
      const invalidCacheEntry = {
        data: [{ code: 'USD', name: 'United States Dollar' }],
        timestamp: 'not-a-number',
        ttl: 86400000,
      };

      const result = CurrencyCacheEntrySchema.safeParse(invalidCacheEntry);
      expect(result.success).toBe(false);
    });
  });
});