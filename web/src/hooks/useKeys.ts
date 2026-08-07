import { useState, useEffect } from 'react';

export function useKeys() {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKeys() {
      try {
        const res = await fetch('/api/keys');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: string[] = await res.json();
        setKeys(data);
      } catch (err) {
        console.warn('Failed to fetch keys:', err);
        setKeys([]);
      } finally {
        setLoading(false);
      }
    }
    fetchKeys();
  }, []);

  return { keys, loading };
}
