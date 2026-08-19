import { useState } from 'react';
import { AiOutlinePlus, AiOutlineHome, AiOutlineArrowLeft } from 'react-icons/ai';

interface FolderBreadcrumbProps {
  currentFolder: string;
  onNavigate: (folder: string) => void;
  onCreateFolder: (folder: string) => void;
}

export function FolderBreadcrumb({ currentFolder, onNavigate, onCreateFolder }: FolderBreadcrumbProps) {
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');

  const segments = currentFolder === '/'
    ? []
    : currentFolder.split('/').filter(Boolean);

  const parentFolder = segments.length <= 1
    ? '/'
    : '/' + segments.slice(0, -1).join('/');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const fullPath = currentFolder === '/'
      ? `/${newName.trim()}`
      : `${currentFolder}/${newName.trim()}`;
    onCreateFolder(fullPath);
    setNewName('');
    setShowInput(false);
  }

  return (
    <div className="flex items-center gap-1.5 text-sm min-h-[28px]">
      {currentFolder !== '/' && (
        <button
          onClick={() => onNavigate(parentFolder)}
          className="p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors text-gray-500 hover:text-gray-800"
          title="Go back"
        >
          <AiOutlineArrowLeft className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={() => onNavigate('/')}
        className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
          currentFolder === '/'
            ? 'text-gray-800 font-medium'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
        }`}
        title="Root"
      >
        <AiOutlineHome className="w-4 h-4" />
      </button>

      {segments.map((segment, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1">
            <span className="text-gray-300">/</span>
            <button
              onClick={() => onNavigate(path)}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                isLast
                  ? 'text-gray-800 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {segment}
            </button>
          </span>
        );
      })}

      <span className="mx-1 text-gray-200">|</span>

      {showInput ? (
        <form onSubmit={handleCreate} className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New folder"
            className="border border-gray-300 rounded px-2 py-0.5 text-xs w-32 outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400"
            autoFocus
            onBlur={() => { if (!newName.trim()) setShowInput(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowInput(false); }}
          />
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
          title="New folder"
        >
          <AiOutlinePlus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
