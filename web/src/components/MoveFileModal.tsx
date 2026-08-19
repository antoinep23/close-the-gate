import { useState } from 'react';
import { AiOutlineClose, AiOutlineFolder } from 'react-icons/ai';
import { moveFile } from '../services/api';

interface MoveFileModalProps {
  isOpen: boolean;
  fileName: string;
  currentFolder: string;
  folders: string[];
  onClose: () => void;
  onSuccess: (fileName: string, folder: string) => void;
  onError: (fileName: string, error: string) => void;
}

export function MoveFileModal({ isOpen, fileName, currentFolder, folders, onClose, onSuccess, onError }: MoveFileModalProps) {
  const availableFolders = folders.filter((f) => f !== currentFolder);
  const [selectedFolder, setSelectedFolder] = useState(availableFolders[0] || '/');
  const [moving, setMoving] = useState(false);

  if (!isOpen) return null;

  async function handleMove() {
    if (!selectedFolder) return;

    setMoving(true);
    const result = await moveFile(fileName, selectedFolder);
    setMoving(false);

    if (result.success) {
      onSuccess(fileName, selectedFolder);
      onClose();
    } else {
      onError(fileName, result.error || 'Move failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">Move File</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Current folder</label>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{currentFolder === '/' ? '/ (root)' : currentFolder}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Move to</label>
            {availableFolders.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No other folders available</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {availableFolders.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFolder(f)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      selectedFolder === f
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <AiOutlineFolder className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{f === '/' ? '/ (root)' : f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleMove}
          disabled={!selectedFolder || availableFolders.length === 0 || moving}
          className="mt-6 w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {moving ? 'Moving...' : 'Move'}
        </button>
      </div>
    </div>
  );
}
