import { useState, useRef } from 'react';
import {
  AiOutlineDownload,
  AiOutlineLoading3Quarters,
  AiOutlineStar,
  AiFillStar,
  AiOutlineDelete,
  AiOutlineSync,
  AiOutlineLock,
  AiOutlineUnlock,
  AiOutlineEye,
  AiOutlineFolderOpen,
  AiOutlineEdit,
} from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatSize } from '../utils/format';
import { useFileActions } from '../hooks/useFileActions';
import { ConfirmModal } from './ConfirmModal';

interface FileCardProps {
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
  onMoveClick?: (fileName: string, folder: string) => void;
  onProtectionChange?: (fileName: string, isProtected: boolean) => void;
  onRename?: (oldName: string, newName: string) => void;
  onSelect?: () => void;
  hideDownload?: boolean;
}

export function FileCard({
  file,
  onDownloadSuccess,
  onDownloadError,
  onFileOpen,
  onStarToggle,
  onDeleteSuccess,
  onDeleteError,
  onDeleteLocalSuccess,
  onDeleteLocalError,
  onRotateClick,
  onPreviewClick,
  onMoveClick,
  onProtectionChange,
  onRename,
  onSelect,
  hideDownload,
}: FileCardProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(file.fileName);
  const {
    downloading,
    deleting,
    confirmOpen,
    setConfirmOpen,
    unlockOpen,
    setUnlockOpen,
    starred,
    isProtected,
    isLocalDelete,
    handleDownload,
    handleStar,
    handleLock,
    confirmUnlock,
    handleDelete,
    confirmDelete,
  } = useFileActions(file, {
    onDownloadSuccess,
    onDownloadError,
    onStarToggle,
    onDeleteSuccess,
    onDeleteError,
    onDeleteLocalSuccess,
    onDeleteLocalError,
    onProtectionChange,
  });

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
    if (e.key === 'Escape') {
      setEditing(false);
      setEditName(file.fileName);
    }
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
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', file.fileName);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group relative border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col h-full active:bg-blue-100"
    >
      {/* Persistent badges */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5">
        {starred && <AiFillStar className="w-3.5 h-3.5 text-yellow-400" />}
        {isProtected && (
          <AiOutlineLock className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>

      {/* File icon */}
      <div className="flex items-center justify-center py-5">
        <Icon className={`w-8 h-8 ${color}`} />
      </div>

      {/* File name */}
      {editing ? (
        <input
          ref={renameInputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-gray-800 text-center border border-blue-400 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-200 w-full"
        />
      ) : (
        <div className="flex items-center justify-center gap-1 w-full px-1">
          <p
            className="text-sm text-gray-800 text-center truncate"
            title={file.fileName}
          >
            {file.fileName}
          </p>
          {onRename && (
            <button
              onClick={handleNameClick}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 cursor-pointer transition-all shrink-0"
              title="Rename"
            >
              <AiOutlineEdit className="w-0 h-0 group-hover:w-3 group-hover:h-3 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Date + size */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>{formatDate(file.uploadDate)}</span>
        <span>{formatSize(file.size)}</span>
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 border-t border-gray-100 rounded-b-xl px-2 py-1.5 flex items-center justify-center gap-0.5">
        {onPreviewClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreviewClick(file.fileName, file.keyName);
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Preview"
          >
            <AiOutlineEye className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
        {!hideDownload && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Download"
          >
            {downloading ? (
              <AiOutlineLoading3Quarters className="w-3.5 h-3.5 text-gray-500 animate-spin" />
            ) : (
              <AiOutlineDownload className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        )}
        {onRotateClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotateClick(file.fileName, file.keyName);
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Rotate key"
          >
            <AiOutlineSync className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
        {onMoveClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveClick(file.fileName, file.folder || '/');
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Move to folder"
          >
            <AiOutlineFolderOpen className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
        {!isLocalDelete && (
          <button
            onClick={handleStar}
            className="p-1.5 rounded-md cursor-pointer transition-colors group/star"
            title={starred ? 'Unstar' : 'Star'}
          >
            {starred ? (
              <AiFillStar className="w-3.5 h-3.5 text-yellow-400" />
            ) : (
              <AiOutlineStar className="w-3.5 h-3.5 text-gray-500 group-hover/star:text-yellow-400" />
            )}
          </button>
        )}
        {!isLocalDelete && (
          <button
            onClick={handleLock}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title={isProtected ? 'Remove protection' : 'Protect'}
          >
            {isProtected ? (
              <AiOutlineLock className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <AiOutlineUnlock className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        )}
        {!isProtected ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title={isLocalDelete ? 'Remove from local' : 'Delete'}
          >
            {deleting ? (
              <AiOutlineLoading3Quarters className="w-3.5 h-3.5 text-gray-500 animate-spin" />
            ) : (
              <AiOutlineDelete className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="p-1.5 inline-block">
            <AiOutlineDelete className="w-3.5 h-3.5 text-gray-200" />
          </span>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={isLocalDelete ? 'Remove local file' : 'Delete file'}
        message={
          isLocalDelete
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
    </div>
  );
}
