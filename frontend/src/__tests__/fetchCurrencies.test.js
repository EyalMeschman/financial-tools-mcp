import { fetchCurrencies, CurrencyFetchError } from '../utils/fetchCurrencies';
import { getCached, setCached, clearAllCache } from '../cache';

// Mock fetch
global.fetch = jest.fn();

// Mock cache functions
jest.mock('../cache', () => ({
  getCached: jest.fn(),
  setCached: jest.fn(),
  clearAllCache: jest.fn()
}));

describe('fetchCurrencies with Cache', () => {
  beforeEach(() => {
    fetch.mockClear();
    getCached.mockClear();
    setCached.mockClear();
    clearAllCache.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Cache Integration', () => {
    it('should fetch from network on first call (cache miss)', async () => {
      const mockData = {
        USD: { name: 'US Dollar' },
        EUR: { name: 'Euro' }
      };

      const expectedResult = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' }
      ];

      // Mock cache miss
      getCached.mockReturnValue(null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await fetchCurrencies('https://api.example.com/currencies');

      expect(getCached).toHaveBeenCalledWith('currencies_v1');
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/currencies', {
        signal: expect.any(AbortSignal)
      });
      expect(setCached).toHaveBeenCalledWith('currencies_v1', expectedResult, 86400);
      expect(result).toEqual(expectedResult);
    });

    it('should use cache on second call within TTL (cache hit)', async () => {
      const cachedData = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' }
      ];

      // Mock cache hit
      getCached.mockReturnValue(cachedData);

      const result = await fetchCurrencies('https://api.example.com/currencies');

      expect(getCached).toHaveBeenCalledWith('currencies_v1');
      expect(fetch).not.toHaveBeenCalled();
      expect(setCached).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should fetch from network after TTL expired', async () => {
      const mockData = {
        USD: { name: 'US Dollar' },
        EUR: { name: 'Euro' },
        GBP: { name: 'British Pound' }
      };

      const expectedResult = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' },
        { code: 'GBP', name: 'British Pound' }
      ];

      // Mock cache miss (expired)
      getCached.mockReturnValue(null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await fetchCurrencies('https://api.example.com/currencies');

      expect(getCached).toHaveBeenCalledWith('currencies_v1');
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/currencies', {
        signal: expect.any(AbortSignal)
      });
      expect(setCached).toHaveBeenCalledWith('currencies_v1', expectedResult, 86400);
      expect(result).toEqual(expectedResult);
    });

    it('should cache processed data, not raw response', async () => {
      const mockData = {
        USD: { name: 'US Dollar', symbol: '$', extra: 'ignored' },
        EUR: { name: 'Euro', symbol: '€', extra: 'ignored' }
      };

      const expectedProcessedData = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' }
      ];

      getCached.mockReturnValue(null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await fetchCurrencies('https://api.example.com/currencies');

      expect(setCached).toHaveBeenCalledWith('currencies_v1', expectedProcessedData, 86400);
    });

    it('should handle array format data and cache it', async () => {
      const mockData = [
        { code: 'USD', name: 'US Dollar', extra: 'ignored' },
        { code: 'EUR', name: 'Euro', extra: 'ignored' }
      ];

      const expectedProcessedData = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' }
      ];

      getCached.mockReturnValue(null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await fetchCurrencies('https://api.example.com/currencies');

      expect(setCached).toHaveBeenCalledWith('currencies_v1', expectedProcessedData, 86400);
    });

    it('should not cache on network error', async () => {
      getCached.mockReturnValue(null);
      fetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow(CurrencyFetchError);

      expect(getCached).toHaveBeenCalledWith('currencies_v1');
      expect(fetch).toHaveBeenCalled();
      expect(setCached).not.toHaveBeenCalled();
    });
  });

  describe('Existing Functionality', () => {
    beforeEach(() => {
      // Mock cache miss for these tests
      getCached.mockReturnValue(null);
    });

    it('should throw CurrencyFetchError on timeout', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );

      const promise = fetchCurrencies('https://api.example.com/currencies', { timeoutMs: 1000 });

      jest.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow(CurrencyFetchError);
      await expect(promise).rejects.toThrow('Request timed out after 1000ms');
    });

    it('should throw CurrencyFetchError on HTTP error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow(CurrencyFetchError);
      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow('HTTP 404: Not Found');
    });

    it('should throw CurrencyFetchError on invalid JSON', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      });

      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow(CurrencyFetchError);
      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow('Invalid JSON response');
    });

    it('should throw CurrencyFetchError when response is not a valid object', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'invalid-response'
      });

      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow(CurrencyFetchError);
      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow('Response is not a valid object');
    });

    it('should use default timeout of 5000ms', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );

      const promise = fetchCurrencies('https://api.example.com/currencies');

      jest.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow('Request timed out after 5000ms');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow(CurrencyFetchError);
      await expect(fetchCurrencies('https://api.example.com/currencies'))
        .rejects.toThrow('Network error');
    });
  });
});