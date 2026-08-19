import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineSync } from 'react-icons/ai';
import { rotateKey } from '../services/api';

interface RotateKeyModalProps {
  isOpen: boolean;
  fileName: string;
  currentKeyName: string;
  keys: string[];
  onClose: () => void;
  onSuccess: (fileName: string) => void;
  onError: (fileName: string, error: string) => void;
}

export function RotateKeyModal({ isOpen, fileName, currentKeyName, keys, onClose, onSuccess, onError }: RotateKeyModalProps) {
  const availableKeys = keys.filter((k) => k !== currentKeyName);
  const [selectedKey, setSelectedKey] = useState('');
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedKey(availableKeys[0] || '');
    }
  }, [isOpen, currentKeyName]);

  if (!isOpen) return null;

  async function handleRotate() {
    if (!selectedKey) return;

    setRotating(true);
    const result = await rotateKey(fileName, currentKeyName, selectedKey);
    setRotating(false);

    if (result.success) {
      onSuccess(fileName);
      onClose();
    } else {
      onError(fileName, result.error || 'Rotation failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">Rotate Key</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 truncate">{fileName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current key</label>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 truncate">{currentKeyName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New key</label>
            {availableKeys.length === 0 ? (
              <p className="text-sm text-red-500">No other keys available. Generate a new key first.</p>
            ) : (
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
              >
                {availableKeys.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          onClick={handleRotate}
          disabled={!selectedKey || rotating}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <AiOutlineSync className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
          {rotating ? 'Rotating...' : 'Rotate Key'}
        </button>
      </div>
    </div>
  );
}
