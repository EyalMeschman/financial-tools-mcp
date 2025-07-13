import { useState, useEffect, useRef } from 'react';

interface UseSseReturn<T = unknown> {
  data: T | null;
  error: string | null;
}

export const useSse = <T = unknown>(url: string): UseSseReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data) as T;
        setData(parsedData);
        setError(null);
      } catch {
        setError('Failed to parse JSON data');
      }
    };

    eventSource.onerror = () => {
      setError('EventSource connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error };
};