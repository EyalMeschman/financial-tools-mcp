import { fetchCurrencies, CurrencyFetchError } from './fetchCurrencies.js';

// Mock fetch
global.fetch = jest.fn();

describe('fetchCurrencies', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should fetch currencies successfully', async () => {
    const mockData = [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await fetchCurrencies('https://api.example.com/currencies');

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/currencies', {
      signal: expect.any(AbortSignal)
    });
    expect(result).toEqual(mockData);
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

  it('should throw CurrencyFetchError when response is not an array', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Invalid format' })
    });

    await expect(fetchCurrencies('https://api.example.com/currencies'))
      .rejects.toThrow(CurrencyFetchError);
    await expect(fetchCurrencies('https://api.example.com/currencies'))
      .rejects.toThrow('Response is not an array');
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

  it('should map response data to code and name properties', async () => {
    const mockData = [
      { code: 'USD', name: 'US Dollar', extra: 'ignored' },
      { code: 'EUR', name: 'Euro', symbol: '€' }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await fetchCurrencies('https://api.example.com/currencies');

    expect(result).toEqual([
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' }
    ]);
  });
});