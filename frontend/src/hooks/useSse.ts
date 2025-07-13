import { useState, useEffect, useRef } from 'react';

interface UseSseReturn {
  data: any;
  error: string | null;
}

export const useSse = (url: string): UseSseReturn => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
        setError(null);
      } catch (err) {
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