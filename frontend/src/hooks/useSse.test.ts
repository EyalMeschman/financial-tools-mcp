import { renderHook, act } from '@testing-library/react';
import { useSse } from './useSse';

// Mock EventSource
interface MockEventSourceType {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  readyState: number;
  close: jest.Mock;
  simulateMessage: (data: string) => void;
  simulateError: () => void;
}

let mockEventSource: MockEventSourceType;

const createMockEventSource = () => ({
  url: '',
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  readyState: 1,
  close: jest.fn(),
  simulateMessage: function(data: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  },
  simulateError: function() {
    if (this.onerror) {
      const event = new Event('error');
      this.onerror(event);
    }
  }
});

// Mock the global EventSource
const originalEventSource = global.EventSource;
beforeEach(() => {
  mockEventSource = createMockEventSource();
  global.EventSource = jest.fn().mockImplementation((url) => {
    mockEventSource.url = url;
    return mockEventSource;
  }) as unknown as typeof EventSource;
});

afterEach(() => {
  global.EventSource = originalEventSource;
  jest.clearAllMocks();
});

describe('useSse', () => {
  it('should handle two events and update data progressively', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    // Initially should have no data
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Simulate first event with 25% progress
    act(() => {
      mockEventSource.simulateMessage(JSON.stringify({ percentage: 25 }));
    });

    expect(result.current.data).toEqual({ percentage: 25 });
    expect(result.current.error).toBeNull();

    // Simulate second event with 75% progress
    act(() => {
      mockEventSource.simulateMessage(JSON.stringify({ percentage: 75 }));
    });

    expect(result.current.data).toEqual({ percentage: 75 });
    expect(result.current.error).toBeNull();
  });

  it('should handle JSON parse errors', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    act(() => {
      mockEventSource.simulateMessage('invalid json');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Failed to parse JSON data');
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    act(() => {
      mockEventSource.simulateError();
    });

    expect(result.current.error).toBe('EventSource connection error');
  });
});