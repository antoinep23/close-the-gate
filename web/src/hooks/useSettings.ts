import { useState, useEffect, useCallback } from 'react';
import type { PathSettings } from '../components/SettingsModal';

const DEFAULT_SETTINGS: PathSettings = {
  keysPath: './keys',
  filesPath: './files',
  downloadPath: './download',
  region: 'eu-west-1',
  autoRotation: {
    enabled: false,
    intervalDays: 90,
    targetKey: '',
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<PathSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PathSettings = await res.json();
        setSettings(data);
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const saveSettings = useCallback(async (newSettings: PathSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('Failed to persist settings:', err);
    }
  }, []);

  return { settings, saveSettings, loading };
}
