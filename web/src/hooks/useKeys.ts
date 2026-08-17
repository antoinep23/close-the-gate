import { useState, useEffect, useCallback } from 'react';

export function useKeys() {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return { keys, loading, refetchKeys: fetchKeys };
}
