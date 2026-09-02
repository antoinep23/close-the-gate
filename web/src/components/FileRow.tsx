import { useRef, useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar, AiOutlineDelete, AiOutlineSync, AiOutlineLock, AiOutlineUnlock, AiOutlineEye, AiOutlineFolderOpen, AiOutlineEdit, AiOutlineShareAlt } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatSize } from '../utils/format';
import { useFileActions } from '../hooks/useFileActions';
import { ConfirmModal } from './ConfirmModal';

interface FileRowProps {
  file: FileItem;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (fileName: string, error: string) => void;
  onFileOpen?: (fileName: string) => void;
  onStarToggle?: (fileName: string, isStarred: boolean) => void;
  onDeleteSuccess?: (fileName: string) => void;
  onDeleteError?: (fileName: string, error: string) => void;
  onDeleteLocalSuccess?: (fileName: string) => void;
  onDeleteLocalError?: (fileName: string, error: string) => void;
  onRotateClick?: (fileName: string, keyName: string) => void;
  onPreviewClick?: (fileName: string, keyName: string) => void;
  onShareClick?: (fileName: string, keyName: string) => void;
  onMoveClick?: (fileName: string, folder: string) => void;
  onProtectionChange?: (fileName: string, isProtected: boolean) => void;
  onRename?: (oldName: string, newName: string) => void;
  onSelect?: () => void;
  hideDownload?: boolean;
}

export function FileRow({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, onRotateClick, onPreviewClick, onShareClick, onMoveClick, onProtectionChange, onRename, onSelect, hideDownload }: FileRowProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(file.fileName);
  const {
    downloading, deleting, confirmOpen, setConfirmOpen, unlockOpen, setUnlockOpen,
    starred, isProtected, isLocalDelete,
    handleDownload, handleStar, handleLock, confirmUnlock, handleDelete, confirmDelete,
  } = useFileActions(file, {
    onDownloadSuccess, onDownloadError, onStarToggle,
    onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError,
    onProtectionChange,
  });

  function handleDragStart(e: React.DragEvent<HTMLTableRowElement>) {
    e.dataTransfer.setData('text/plain', file.fileName);
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image: icon + file name
    const ghost = document.createElement('div');
    ghost.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-size:13px;color:#1f2937;white-space:nowrap;position:fixed;top:-1000px;left:-1000px;z-index:9999;pointer-events:none;';

    // Clone the icon from the first cell
    const iconEl = (e.currentTarget.querySelector('td .flex svg') as HTMLElement)?.cloneNode(true) as HTMLElement;
    if (iconEl) {
      iconEl.style.width = '16px';
      iconEl.style.height = '16px';
      iconEl.style.flexShrink = '0';
      ghost.appendChild(iconEl);
    }

    const label = document.createElement('span');
    label.textContent = file.fileName;
    ghost.appendChild(label);

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    dragGhostRef.current = ghost;
  }

  function handleDragEnd() {
    if (dragGhostRef.current) {
      document.body.removeChild(dragGhostRef.current);
      dragGhostRef.current = null;
    }
  }

  function handleClick() {
    onSelect?.();
  }

  function handleNameClick(e: React.MouseEvent) {
    if (!onRename) return;
    e.stopPropagation();
    setEditName(file.fileName);
    setEditing(true);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }

  function handleRenameSubmit() {
    setEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== file.fileName && onRename) {
      onRename(file.fileName, trimmed);
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') { setEditing(false); setEditName(file.fileName); }
  }

  function handleDoubleClick() {
    if (!confirmOpen && !deleting) {
      if (onPreviewClick) {
        onPreviewClick(file.fileName, file.keyName);
      } else if (onFileOpen) {
        onFileOpen(file.fileName);
      }
    }
  }

  return (
    <>
      <tr
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="group border-b border-gray-300 hover:bg-gray-100 transition-colors active:bg-blue-100"
      >
        <td className="py-3 px-2">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            {editing ? (
              <input
                ref={renameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-gray-800 border border-blue-400 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-200 w-full max-w-[200px]"
              />
            ) : (
              <>
                <span className="text-sm text-gray-800">{file.fileName}</span>
                {onRename && (
                  <button
                    onClick={handleNameClick}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
                    title="Rename"
                  >
                    <AiOutlineEdit className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </>
            )}
          </div>
        </td>
        <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">{formatDate(file.uploadDate)}</td>
        <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">{formatSize(file.size)}</td>
        {onPreviewClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onPreviewClick(file.fileName, file.keyName); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Preview ${file.fileName}`}
              title="Preview"
            >
              <AiOutlineEye className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        {!hideDownload && (
          <td className="py-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Download ${file.fileName}`}
              title="Download"
            >
              {downloading ? (
                <AiOutlineLoading3Quarters className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <AiOutlineDownload className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </td>
        )}
        {onRotateClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onRotateClick(file.fileName, file.keyName); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Rotate key for ${file.fileName}`}
              title="Rotate key"
            >
              <AiOutlineSync className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        {onShareClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onShareClick(file.fileName, file.keyName); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Share ${file.fileName}`}
              title="Share"
            >
              <AiOutlineShareAlt className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        {!isLocalDelete && (
          <td className="py-3">
            <button
              onClick={handleStar}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                starred ? 'text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-yellow-400'
              }`}
              aria-label={starred ? 'Unstar' : 'Star'}
              title={starred ? 'Unstar' : 'Star'}
            >
              {starred ? <AiFillStar className="w-4 h-4" /> : <AiOutlineStar className="w-4 h-4" />}
            </button>
          </td>
        )}
        {!isLocalDelete && (
          <td className="py-3">
            <button
              onClick={handleLock}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                isProtected
                  ? 'text-amber-500 hover:bg-gray-200'
                  : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label={isProtected ? 'Unlock deletion' : 'Lock deletion'}
              title={isProtected ? 'Remove deletion protection' : 'Protect from deletion'}
            >
              {isProtected ? <AiOutlineLock className="w-4 h-4" /> : <AiOutlineUnlock className="w-4 h-4" />}
            </button>
          </td>
        )}
        {onMoveClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveClick(file.fileName, file.folder || '/'); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Move ${file.fileName}`}
              title="Move to folder"
            >
              <AiOutlineFolderOpen className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        <td className="py-3">
          {!isProtected ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full cursor-pointer transition-all"
              aria-label={`Delete ${file.fileName}`}
              title={isLocalDelete ? 'Remove from local' : 'Delete from cloud bucket'}
            >
              {deleting ? (
                <AiOutlineLoading3Quarters className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <AiOutlineDelete className="w-4 h-4 text-gray-500 hover:text-red-500" />
              )}
            </button>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 px-1 mt-1 inline-block" title="Deletion protected">
              <AiOutlineDelete className="w-4 h-4 text-gray-300" />
            </span>
          )}
        </td>
      </tr>
      <ConfirmModal
        isOpen={confirmOpen}
        title={isLocalDelete ? 'Remove local file' : 'Delete file'}
        message={isLocalDelete
          ? `Remove "${file.fileName}" from local downloads?`
          : `"${file.fileName}" will be permanently deleted from the cloud bucket. This cannot be undone.`
        }
        confirmLabel={isLocalDelete ? 'Remove' : 'Delete'}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmModal
        isOpen={unlockOpen}
        title="Remove deletion protection"
        message={`This file is protected from deletion. To remove protection, type the confirmation text below.`}
        confirmLabel="Unlock"
        confirmText={`unlock ${file.fileName}`}
        onConfirm={confirmUnlock}
        onCancel={() => setUnlockOpen(false)}
      />
    </>
  );
}
