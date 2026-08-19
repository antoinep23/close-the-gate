import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineSync, AiOutlineWarning } from 'react-icons/ai';

interface EmergencyRotationModalProps {
  isOpen: boolean;
  keys: string[];
  fileCount: number;
  onClose: () => void;
  onConfirm: (targetKey: string) => void;
}

export function EmergencyRotationModal({ isOpen, keys, fileCount, onClose, onConfirm }: EmergencyRotationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [selectedKey, setSelectedKey] = useState('__auto_generate__');

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setSelectedKey('__auto_generate__');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmText === 'rotate all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AiOutlineWarning className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-medium text-gray-800">Emergency Key Rotation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-5">
          <p className="text-sm text-red-700">
            This will rotate the encryption key of <span className="font-bold">{fileCount} file(s)</span> sequentially. Use this if a key has been compromised.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New target key</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            >
              <option value="__auto_generate__">Auto-generate new key</option>
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            {selectedKey === '__auto_generate__' && (
              <p className="text-xs text-gray-400 mt-1">A new key will be generated</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-600">rotate all</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="rotate all"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
            />
          </div>
        </div>

        <button
          onClick={() => onConfirm(selectedKey)}
          disabled={!isConfirmed}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <AiOutlineSync className="w-4 h-4" />
          Rotate All Keys
        </button>
      </div>
    </div>
  );
}
