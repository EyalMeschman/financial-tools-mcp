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
  constructor(callback: ResizeObserverCallback) {
    // Store callback for potential use in tests
  }
}

global.ResizeObserver = MockResizeObserver as any;

// Mock IntersectionObserver for Headless UI
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Store callback for potential use in tests
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;