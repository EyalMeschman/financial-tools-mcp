import '@testing-library/jest-dom';

// Suppress specific React act() warnings from async useEffect operations
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('An update to') &&
      args[0].includes('inside a test was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock EventSource globally for all tests
global.EventSource = jest.fn().mockImplementation(() => ({
  onmessage: null,
  onerror: null,
  readyState: 1,
  close: jest.fn(),
})) as unknown as typeof EventSource;

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Mock ResizeObserver for Headless UI
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor() {
    // Mock implementation - no callback needed
  }
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver for Headless UI
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor() {
    // Mock implementation - no callback needed
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock import.meta for Vite environment variables
Object.defineProperty(globalThis, 'import.meta', {
  value: {
    env: {
      VITE_API_BASE_URL: '',
    },
  },
  writable: true,
});