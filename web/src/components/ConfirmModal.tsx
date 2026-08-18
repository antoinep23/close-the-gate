import { useState, useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, confirmLabel = 'Delete', confirmText, onConfirm, onCancel }: ConfirmModalProps) {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!isOpen) setInput('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = confirmText ? input !== confirmText : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-medium text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>

        {confirmText && (
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">
              Type <span className="text-red-600">{confirmText}</span> to confirm
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={confirmText}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-red-200 focus:border-red-400 transition-all"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLocked}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
