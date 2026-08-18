import { useState, useEffect, useCallback } from 'react';
import { AiOutlineSync, AiOutlineClose } from 'react-icons/ai';

interface EligibleFile {
  fileName: string;
  keyName: string;
  uploadDate: string;
}

interface RotationCheckResponse {
  eligible: EligibleFile[];
  count: number;
  enabled: boolean;
  targetKey?: string;
  error?: string;
}

interface RotationBannerProps {
  onRotateComplete: () => void;
  onError: (error: string) => void;
}

export function RotationBanner({ onRotateComplete, onError }: RotationBannerProps) {
  const [eligible, setEligible] = useState<EligibleFile[]>([]);
  const [targetKey, setTargetKey] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const checkRotation = useCallback(async () => {
    try {
      const res = await fetch('/api/files/rotation-check');
      if (!res.ok) return;
      const data: RotationCheckResponse = await res.json();

      if (data.enabled && data.count > 0 && data.targetKey) {
        setEligible(data.eligible);
        setTargetKey(data.targetKey);
      } else {
        setEligible([]);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    checkRotation();
  }, [checkRotation]);

  async function handleRotate() {
    if (eligible.length === 0 || !targetKey) return;

    setRotating(true);
    setProgress({ done: 0, total: eligible.length });

    try {
      const res = await fetch('/api/files/rotate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: eligible.map((f) => ({ fileName: f.fileName, keyName: f.keyName })),
          targetKey,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setProgress({ done: data.rotated, total: data.total });
        const failed = data.results.filter((r: { success: boolean }) => !r.success);
        if (failed.length > 0) {
          onError(`Rotated ${data.rotated}/${data.total} files. ${failed.length} failed.`);
        }
        onRotateComplete();
        setEligible([]);
      } else {
        onError(data.error || 'Batch rotation failed');
      }
    } catch {
      onError('Network error during batch rotation');
    } finally {
      setRotating(false);
    }
  }

  if (dismissed || eligible.length === 0) return null;

  return (
    <div className="mx-6 mt-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <AiOutlineSync className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-800">
          <span className="font-medium">{eligible.length} file{eligible.length > 1 ? 's' : ''}</span> need key rotation
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRotate}
          disabled={rotating}
          className="px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rotating ? `Rotating ${progress.done}/${progress.total}...` : 'Rotate now'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-100 cursor-pointer transition-colors"
          aria-label="Dismiss"
        >
          <AiOutlineClose className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>
    </div>
  );
}
