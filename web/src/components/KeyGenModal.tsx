import { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { generateKey } from '../services/api';

interface KeyGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (keyName: string) => void;
  onError: (error: string) => void;
}

export function KeyGenModal({ isOpen, onClose, onSuccess, onError }: KeyGenModalProps) {
  const [keyName, setKeyName] = useState('');
  const [bytes, setBytes] = useState(32);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateKey(keyName || undefined, bytes);
    setGenerating(false);

    if (result.success) {
      onSuccess(result.keyName || 'key');
      setKeyName('');
      setBytes(32);
      onClose();
    } else {
      onError(result.error || 'Unknown error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-800">Generate Key</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="my-secret-key"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty for auto-generated UUID name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key size (bytes)
            </label>
            <select
              value={bytes}
              onChange={(e) => setBytes(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
            >
              <option value={16}>16 bytes (128-bit)</option>
              <option value={32}>32 bytes (256-bit)</option>
              <option value={64}>64 bytes (512-bit)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-6 w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {generating ? 'Generating...' : 'Generate Key'}
        </button>
      </div>
    </div>
  );
}
