import '@testing-library/jest-dom';

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