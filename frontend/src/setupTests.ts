import '@testing-library/jest-dom';

// Mock EventSource globally for all tests
global.EventSource = jest.fn().mockImplementation(() => ({
  onmessage: null,
  onerror: null,
  readyState: 1,
  close: jest.fn(),
})) as any;