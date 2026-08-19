import { useState } from 'react';
import { AiOutlineLock, AiOutlineLoading3Quarters } from 'react-icons/ai';

interface UnlockBannerProps {
  onUnlockSuccess: () => void;
  onError: (error: string) => void;
}

export function UnlockBanner({ onUnlockSuccess, onError }: UnlockBannerProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok) {
        setPassword('');
        onUnlockSuccess();
      } else {
        onError(data.error || 'Unlock failed');
      }
    } catch {
      onError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-6 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2.5 mb-2">
        <AiOutlineLock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-medium text-amber-800">High Security Mode — Keys are locked</span>
      </div>
      <p className="text-xs text-amber-600 mb-3">Enter your password to unlock keys and enable file operations.</p>
      <form onSubmit={handleUnlock} className="flex items-center gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="flex-1 border border-amber-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white transition-all"
          autoFocus
        />
        <button
          type="submit"
          disabled={!password || loading}
          className="px-4 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? (
            <AiOutlineLoading3Quarters className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <AiOutlineLock className="w-3.5 h-3.5" />
          )}
          Unlock
        </button>
      </form>
    </div>
  );
}
