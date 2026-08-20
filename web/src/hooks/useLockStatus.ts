import { useState, useEffect, useCallback } from 'react';
import type { PathSettings } from '../components/SettingsModal';

interface LockState {
  highSecurity: boolean;
  unlocked: boolean;
}

export function useLockStatus(refetchKeys: () => void, addToast: (type: 'success' | 'error', message: string) => void, saveSettings: (s: PathSettings) => void) {
  const [lockStatus, setLockStatus] = useState<LockState>({ highSecurity: false, unlocked: false });

  const fetchLockStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/lock-status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.highSecurity && data.unlocked) {
          await fetch('/api/lock', { method: 'POST' });
          setLockStatus({ highSecurity: true, unlocked: false });
        } else {
          setLockStatus(data);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLockStatus().then(() => refetchKeys());
  }, [fetchLockStatus, refetchKeys]);

  const handleLock = useCallback(async () => {
    try {
      await fetch('/api/lock', { method: 'POST' });
      setLockStatus({ highSecurity: true, unlocked: false });
      refetchKeys();
      addToast('success', 'Keys locked');
    } catch {
      addToast('error', 'Failed to lock keys');
    }
  }, [addToast, refetchKeys]);

  const handleUnlockSuccess = useCallback(() => {
    setLockStatus({ highSecurity: true, unlocked: true });
    refetchKeys();
    addToast('success', 'Keys unlocked');
  }, [addToast, refetchKeys]);

  const handleHighSecurityToggle = useCallback(async (enabled: boolean, password?: string) => {
    try {
      if (enabled && password) {
        const res = await fetch('/api/high-security/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (res.ok) {
          setLockStatus({ highSecurity: true, unlocked: true });
          addToast('success', `High security enabled. ${data.keyCount} key(s) encrypted.`);
          refetchKeys();
        } else {
          addToast('error', data.error || 'Failed to enable high security');
        }
      } else {
        const res = await fetch('/api/high-security/disable', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          setLockStatus({ highSecurity: false, unlocked: false });
          addToast('success', 'High security disabled. Keys restored to disk.');
          refetchKeys();
        } else {
          addToast('error', data.error || 'Failed to disable high security');
        }
      }
      const settingsRes = await fetch('/api/settings', { cache: 'no-store' });
      if (settingsRes.ok) {
        const newSettings = await settingsRes.json();
        saveSettings(newSettings);
      }
    } catch {
      addToast('error', 'Network error');
    }
  }, [addToast, refetchKeys, saveSettings]);

  return { lockStatus, handleLock, handleUnlockSuccess, handleHighSecurityToggle };
}
