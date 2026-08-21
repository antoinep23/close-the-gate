import { useState, useEffect, useRef } from 'react';
import { AiOutlineClose } from 'react-icons/ai';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function CreateFolderModal({ isOpen, onClose, onConfirm }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">New folder</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
          />

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
