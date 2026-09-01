import { useState } from 'react';
import { AiOutlineLock, AiOutlineLoading3Quarters, AiOutlineUnlock } from 'react-icons/ai';

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
    <div className="flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10 text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
            <AiOutlineLock className="w-7 h-7 text-gray-500" />
          </div>

          <h2 className="text-xl font-medium text-gray-800 mb-1.5">High Security Mode</h2>
          <p className="text-sm text-gray-500 mb-7 leading-relaxed">
            Your keys are locked and stored encrypted. Enter your password to unlock them and access your content.
          </p>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={!password || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <AiOutlineUnlock className="w-4 h-4" />
                  Unlock
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Keys are decrypted in memory only and never written to disk.
        </p>
      </div>
    </div>
  );
}
