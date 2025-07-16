import { getCached, setCached, clearCached, clearAllCache } from './cache.js';

// Mock localStorage
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

// Replace localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Cache', () => {
  beforeEach(() => {
    // Clear the mock store and reset call counts
    mockLocalStorage.store = {};
    jest.clearAllMocks();
  });

  describe('setCached and getCached', () => {
    it('should store and retrieve data', () => {
      const testData = { test: 'data' };
      setCached('test-key', testData, 60);
      
      const retrieved = getCached('test-key');
      expect(retrieved).toEqual(testData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', () => {
      const result = getCached('non-existent-key');
      expect(result).toBeNull();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('non-existent-key');
    });

    it('should store data with correct expiry timestamp', () => {
      const testData = { test: 'data' };
      const ttl = 60;
      const beforeTime = Date.now();
      
      setCached('test-key', testData, ttl);
      
      const afterTime = Date.now();
      const storedValue = JSON.parse(mockLocalStorage.store['test-key']);
      
      expect(storedValue.data).toEqual(testData);
      expect(storedValue.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(storedValue.timestamp).toBeLessThanOrEqual(afterTime);
      expect(storedValue.expiry).toBeGreaterThanOrEqual(beforeTime + (ttl * 1000));
      expect(storedValue.expiry).toBeLessThanOrEqual(afterTime + (ttl * 1000));
    });

    it('should handle data without TTL', () => {
      const testData = { test: 'data' };
      setCached('test-key', testData);
      
      const storedValue = JSON.parse(mockLocalStorage.store['test-key']);
      expect(storedValue.data).toEqual(testData);
      expect(storedValue.expiry).toBeNull();
    });
  });

  describe('TTL expiry', () => {
    it('should return cached data within TTL', () => {
      const testData = { test: 'data' };
      setCached('test-key', testData, 60); // 60 seconds TTL
      
      const result = getCached('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for expired data', () => {
      const testData = { test: 'data' };
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const startTime = 1000000000000; // Fixed timestamp
      Date.now = jest.fn(() => startTime);
      
      setCached('test-key', testData, 60); // 60 seconds TTL
      
      // Advance time by 61 seconds
      Date.now = jest.fn(() => startTime + 61000);
      
      const result = getCached('test-key');
      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should not expire data without TTL', () => {
      const testData = { test: 'data' };
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      const startTime = 1000000000000;
      Date.now = jest.fn(() => startTime);
      
      setCached('test-key', testData); // No TTL
      
      // Advance time by a lot
      Date.now = jest.fn(() => startTime + 86400000); // 24 hours later
      
      const result = getCached('test-key');
      expect(result).toEqual(testData);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      // Set invalid JSON directly in mock store
      mockLocalStorage.store['test-key'] = 'invalid-json';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = getCached('test-key');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error retrieving cached data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage.setItem to throw an error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      setCached('test-key', { test: 'data' }, 60);
      expect(consoleSpy).toHaveBeenCalledWith('Error setting cached data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearCached', () => {
    it('should clear specific cache entry', () => {
      setCached('test-key', { test: 'data' }, 60);
      expect(getCached('test-key')).toEqual({ test: 'data' });
      
      clearCached('test-key');
      expect(getCached('test-key')).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors when clearing cache', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage.removeItem to throw an error
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      clearCached('test-key');
      expect(consoleSpy).toHaveBeenCalledWith('Error clearing cached data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache entries', () => {
      setCached('key1', { data: 1 }, 60);
      setCached('key2', { data: 2 }, 60);
      
      clearAllCache();
      
      expect(getCached('key1')).toBeNull();
      expect(getCached('key2')).toBeNull();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    it('should handle errors when clearing all cache', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage.clear to throw an error
      mockLocalStorage.clear.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      clearAllCache();
      expect(consoleSpy).toHaveBeenCalledWith('Error clearing all cached data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});