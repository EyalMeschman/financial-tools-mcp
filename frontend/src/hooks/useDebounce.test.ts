import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 200));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes with default delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'changed' });

    // Should still be the old value before delay
    expect(result.current).toBe('initial');

    // Fast forward time by 199ms (just before delay)
    act(() => {
      jest.advanceTimersByTime(199);
    });

    expect(result.current).toBe('initial');

    // Fast forward time by 1ms more (completing the delay)
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe('changed');
  });

  it('should reset the timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } }
    );

    // Change value multiple times rapidly
    rerender({ value: 'change1' });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'change2' });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });

    // Should still be initial value
    expect(result.current).toBe('initial');

    // Complete the final debounce
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('final');
  });

  it('should work with custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('changed');
  });

  it('should handle different data types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 42 } }
    );

    expect(result.current).toBe(42);

    rerender({ value: 84 });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(84);
  });
});