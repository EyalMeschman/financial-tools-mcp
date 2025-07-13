import { renderHook, act } from '@testing-library/react';
import { useSse } from './useSse';

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 1; // OPEN

  constructor(url: string) {
    this.url = url;
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Helper method to simulate events
  simulateMessage(data: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  }

  simulateError() {
    if (this.onerror) {
      const event = new Event('error');
      this.onerror(event);
    }
  }
}

// Mock the global EventSource
const originalEventSource = global.EventSource;
beforeEach(() => {
  global.EventSource = MockEventSource as any;
});

afterEach(() => {
  global.EventSource = originalEventSource;
});

describe('useSse', () => {
  it('should handle two events and update data progressively', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    // Initially should have no data
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Get the EventSource instance
    const eventSource = (EventSource as any).mock?.instances?.[0] || 
      new (global.EventSource as any)('/test-url');

    // Simulate first event with 25% progress
    act(() => {
      eventSource.simulateMessage(JSON.stringify({ percentage: 25 }));
    });

    expect(result.current.data).toEqual({ percentage: 25 });
    expect(result.current.error).toBeNull();

    // Simulate second event with 75% progress
    act(() => {
      eventSource.simulateMessage(JSON.stringify({ percentage: 75 }));
    });

    expect(result.current.data).toEqual({ percentage: 75 });
    expect(result.current.error).toBeNull();
  });

  it('should handle JSON parse errors', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    const eventSource = new (global.EventSource as any)('/test-url');

    act(() => {
      eventSource.simulateMessage('invalid json');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Failed to parse JSON data');
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useSse('/test-url'));

    const eventSource = new (global.EventSource as any)('/test-url');

    act(() => {
      eventSource.simulateError();
    });

    expect(result.current.error).toBe('EventSource connection error');
  });
});