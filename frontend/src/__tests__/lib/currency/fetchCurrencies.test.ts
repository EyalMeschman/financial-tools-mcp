import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fetchCurrencies, clearCurrencyCache, getCurrencyCacheInfo } from '../../../lib/currency/fetchCurrencies';
import { CurrencyFetchError } from '../../../lib/currency/types';

// Helper function to create mock Response
const createMockResponse = (data: any, options: { ok?: boolean; status?: number; statusText?: string } = {}) => {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    json: async () => data,
  } as Response;
};

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console.warn
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

describe('fetchCurrencies', () => {
  beforeEach(() => {
    // Reset mocks and storage
    mockFetch.mockClear();
    mockConsoleWarn.mockClear();
    mockLocalStorage.clear();
    
    // Mock global objects
    global.fetch = mockFetch;
    global.localStorage = mockLocalStorage as any;
    
    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockCurrencyData = [
    { code: 'USD', name: 'United States Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
  ];

  describe('successful fetch', () => {
    it('should fetch and return currencies', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual(mockCurrencyData);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/currencies', {
        signal: expect.any(AbortSignal),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should cache fetched currencies', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      await fetchCurrencies('https://api.example.com/currencies');
      
      const cachedData = mockLocalStorage.getItem('currency_cache');
      expect(cachedData).toBeTruthy();
      expect(cachedData).toContain('USD');
    });

    it('should filter currencies to only include 3-letter codes', async () => {
      const mixedCurrencyData = [
        { code: 'USD', name: 'United States Dollar', symbol: '$' },
        { code: 'EU', name: 'Invalid Currency' }, // Too short
        { code: 'USDD', name: 'Invalid Currency' }, // Too long
        { code: 'EUR', name: 'Euro', symbol: '€' },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(mixedCurrencyData));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { code: 'USD', name: 'United States Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
      ]);
    });

    it('should use code as fallback symbol when symbol is missing', async () => {
      const currencyDataWithoutSymbol = [
        { code: 'USD', name: 'United States Dollar' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(currencyDataWithoutSymbol));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual([
        { code: 'USD', name: 'United States Dollar', symbol: 'USD' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
      ]);
    });
  });

  describe('caching', () => {
    it('should return cached data when cache is valid', async () => {
      // Set up cached data
      const cachedData = {
        data: mockCurrencyData,
        timestamp: Date.now(),
        ttl: 86400000, // 24 hours
      };
      mockLocalStorage.setItem('currency_cache', JSON.stringify(cachedData));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual(mockCurrencyData);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch new data when cache is expired', async () => {
      // Set up expired cached data
      const expiredCachedData = {
        data: mockCurrencyData,
        timestamp: Date.now() - 86400001, // 24 hours + 1ms ago
        ttl: 86400000, // 24 hours
      };
      mockLocalStorage.setItem('currency_cache', JSON.stringify(expiredCachedData));

      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual(mockCurrencyData);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle invalid cached data gracefully', async () => {
      // Set up invalid cached data
      mockLocalStorage.setItem('currency_cache', 'invalid-json');

      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual(mockCurrencyData);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockLocalStorage.getItem('currency_cache')).toBeTruthy(); // Should have new valid cache
    });

    it('should respect custom cache TTL', async () => {
      const customTtl = 3600000; // 1 hour
      
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      await fetchCurrencies('https://api.example.com/currencies', customTtl);
      
      const cachedData = JSON.parse(mockLocalStorage.getItem('currency_cache')!);
      expect(cachedData.ttl).toBe(customTtl);
    });
  });

  describe('error handling', () => {
    it('should throw CurrencyFetchError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fetchCurrencies('https://api.example.com/currencies')
      ).rejects.toThrow(CurrencyFetchError);
    });

    it('should throw CurrencyFetchError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { ok: false, status: 404, statusText: 'Not Found' }));

      await expect(
        fetchCurrencies('https://api.example.com/currencies')
      ).rejects.toThrow(CurrencyFetchError);
    });

    it('should throw CurrencyFetchError on invalid response data', async () => {
      // Invalid data that passes length filter but fails schema validation
      mockFetch.mockResolvedValueOnce(createMockResponse([{ 
        code: 'USD', 
        name: 'Valid Currency' 
      }, { 
        code: 'ABC', 
        // Missing name - should fail validation
      }]));

      await expect(
        fetchCurrencies('https://api.example.com/currencies')
      ).rejects.toThrow(CurrencyFetchError);
    });

    it('should handle localStorage errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCurrencyData));

      // Mock localStorage.setItem to throw
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('localStorage full');
      });

      const result = await fetchCurrencies('https://api.example.com/currencies');
      
      expect(result).toEqual(mockCurrencyData);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to cache currencies:',
        expect.any(Error)
      );

      // Restore original method
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('clearCurrencyCache', () => {
    it('should clear the currency cache', () => {
      mockLocalStorage.setItem('currency_cache', 'some-data');
      
      clearCurrencyCache();
      
      expect(mockLocalStorage.getItem('currency_cache')).toBeNull();
    });
  });

  describe('getCurrencyCacheInfo', () => {
    it('should return null when no cache exists', () => {
      const result = getCurrencyCacheInfo();
      expect(result).toBeNull();
    });

    it('should return cache info when cache exists', () => {
      const now = Date.now();
      const cachedData = {
        data: mockCurrencyData,
        timestamp: now - 3600000, // 1 hour ago
        ttl: 86400000, // 24 hours
      };
      mockLocalStorage.setItem('currency_cache', JSON.stringify(cachedData));

      const result = getCurrencyCacheInfo();
      
      expect(result).toEqual({
        count: 3,
        age: expect.any(Number),
        remaining: expect.any(Number),
        isValid: true,
      });
    });

    it('should return isValid false for expired cache', () => {
      const now = Date.now();
      const cachedData = {
        data: mockCurrencyData,
        timestamp: now - 86400001, // 24 hours + 1ms ago
        ttl: 86400000, // 24 hours
      };
      mockLocalStorage.setItem('currency_cache', JSON.stringify(cachedData));

      const result = getCurrencyCacheInfo();
      
      expect(result?.isValid).toBe(false);
    });
  });
});