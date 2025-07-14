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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));