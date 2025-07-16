import { filterCurrencies, sortCurrencies } from '../utils/currency-utils';

describe('filterCurrencies', () => {
  const mockCurrencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' }
  ];

  it('should filter currencies by code (case-insensitive)', () => {
    const result = filterCurrencies(mockCurrencies, 'usd');
    expect(result).toEqual([{ code: 'USD', name: 'US Dollar' }]);
  });

  it('should filter currencies by name (case-insensitive)', () => {
    const result = filterCurrencies(mockCurrencies, 'dollar');
    expect(result).toEqual([
      { code: 'USD', name: 'US Dollar' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'AUD', name: 'Australian Dollar' }
    ]);
  });

  it('should filter currencies by partial name match', () => {
    const result = filterCurrencies(mockCurrencies, 'brit');
    expect(result).toEqual([{ code: 'GBP', name: 'British Pound' }]);
  });

  it('should return empty array when no matches found', () => {
    const result = filterCurrencies(mockCurrencies, 'xyz');
    expect(result).toEqual([]);
  });

  it('should return all currencies when query is empty string', () => {
    const result = filterCurrencies(mockCurrencies, '');
    expect(result).toEqual(mockCurrencies);
  });

  it('should return all currencies when query is whitespace only', () => {
    const result = filterCurrencies(mockCurrencies, '   ');
    expect(result).toEqual(mockCurrencies);
  });

  it('should return all currencies when query is null or undefined', () => {
    expect(filterCurrencies(mockCurrencies, null)).toEqual(mockCurrencies);
    expect(filterCurrencies(mockCurrencies, undefined)).toEqual(mockCurrencies);
  });

  it('should return all currencies when query is not a string', () => {
    expect(filterCurrencies(mockCurrencies, 123)).toEqual(mockCurrencies);
    expect(filterCurrencies(mockCurrencies, {})).toEqual(mockCurrencies);
  });

  it('should return empty array when list is not an array', () => {
    expect(filterCurrencies(null, 'USD')).toEqual([]);
    expect(filterCurrencies(undefined, 'USD')).toEqual([]);
    expect(filterCurrencies('not-array', 'USD')).toEqual([]);
  });

  it('should handle currencies with missing or invalid properties', () => {
    const invalidCurrencies = [
      { code: 'USD', name: 'US Dollar' },
      null,
      { code: null, name: 'Euro' },
      { code: 'GBP', name: null },
      'invalid-item',
      { code: 'JPY', name: 'Japanese Yen' }
    ];
    
    const result = filterCurrencies(invalidCurrencies, 'USD');
    expect(result).toEqual([{ code: 'USD', name: 'US Dollar' }]);
  });

  it('should handle currencies with undefined code or name', () => {
    const currenciesWithUndefined = [
      { code: 'USD', name: 'US Dollar' },
      { code: undefined, name: 'Euro' },
      { code: 'GBP', name: undefined }
    ];
    
    const result = filterCurrencies(currenciesWithUndefined, 'euro');
    expect(result).toEqual([{ code: undefined, name: 'Euro' }]);
  });
});

describe('sortCurrencies', () => {
  const mockCurrencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' }
  ];

  it('should sort currencies by name in ascending order', () => {
    const result = sortCurrencies(mockCurrencies);
    expect(result).toEqual([
      { code: 'AUD', name: 'Australian Dollar' },
      { code: 'GBP', name: 'British Pound' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'JPY', name: 'Japanese Yen' },
      { code: 'USD', name: 'US Dollar' }
    ]);
  });

  it('should return a new array (not mutate original)', () => {
    const original = [...mockCurrencies];
    const result = sortCurrencies(mockCurrencies);
    
    expect(result).not.toBe(mockCurrencies);
    expect(mockCurrencies).toEqual(original);
  });

  it('should handle empty array', () => {
    const result = sortCurrencies([]);
    expect(result).toEqual([]);
  });

  it('should handle single item array', () => {
    const singleItem = [{ code: 'USD', name: 'US Dollar' }];
    const result = sortCurrencies(singleItem);
    expect(result).toEqual(singleItem);
  });

  it('should return empty array when input is not an array', () => {
    expect(sortCurrencies(null)).toEqual([]);
    expect(sortCurrencies(undefined)).toEqual([]);
    expect(sortCurrencies('not-array')).toEqual([]);
  });

  it('should handle currencies with missing or invalid properties', () => {
    const invalidCurrencies = [
      { code: 'USD', name: 'US Dollar' },
      null,
      { code: 'EUR', name: null },
      { code: 'GBP', name: 'British Pound' },
      'invalid-item',
      { code: 'JPY', name: 'Japanese Yen' }
    ];
    
    const result = sortCurrencies(invalidCurrencies);
    
    // Items with valid names should be sorted first
    expect(result[0]).toEqual({ code: 'GBP', name: 'British Pound' });
    expect(result[1]).toEqual({ code: 'JPY', name: 'Japanese Yen' });
    expect(result[2]).toEqual({ code: 'USD', name: 'US Dollar' });
    
    // Invalid items should be at the end
    expect(result.slice(-3)).toEqual([null, { code: 'EUR', name: null }, 'invalid-item']);
  });

  it('should handle currencies with undefined name', () => {
    const currenciesWithUndefined = [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: undefined },
      { code: 'GBP', name: 'British Pound' }
    ];
    
    const result = sortCurrencies(currenciesWithUndefined);
    
    expect(result[0]).toEqual({ code: 'GBP', name: 'British Pound' });
    expect(result[1]).toEqual({ code: 'USD', name: 'US Dollar' });
    expect(result[2]).toEqual({ code: 'EUR', name: undefined });
  });

  it('should handle duplicate names', () => {
    const duplicateNames = [
      { code: 'USD', name: 'Dollar' },
      { code: 'CAD', name: 'Dollar' },
      { code: 'AUD', name: 'Dollar' }
    ];
    
    const result = sortCurrencies(duplicateNames);
    
    // All should have the same name, order should be stable
    expect(result).toHaveLength(3);
    result.forEach(currency => {
      expect(currency.name).toBe('Dollar');
    });
  });
});