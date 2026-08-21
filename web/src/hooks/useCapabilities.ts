import { useState, useEffect } from 'react';

interface Capabilities {
  canOpenFiles: boolean;
}

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<Capabilities>({ canOpenFiles: true });

  useEffect(() => {
    async function fetchCapabilities() {
      try {
        const res = await fetch('/api/capabilities');
        if (res.ok) {
          const data = await res.json();
          setCapabilities(data);
        }
      } catch {
        // Default to true (native mode)
      }
    }

    fetchCapabilities();
  }, []);

  return capabilities;
}
