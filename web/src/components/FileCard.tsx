import { useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar, AiOutlineDelete, AiOutlineSync, AiOutlineLock, AiOutlineUnlock, AiOutlineEye, AiOutlineFolderOpen } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { downloadFile, toggleStar, deleteFile, deleteLocalFile, toggleProtection } from '../services/api';
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
  hideDownload?: boolean;
}

export function FileCard({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, onRotateClick, onPreviewClick, onMoveClick, onProtectionChange, hideDownload }: FileCardProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [starred, setStarred] = useState(file.isStarred);
  const [protected_, setProtected] = useState(file.isProtected);

  const isLocalDelete = !!onDeleteLocalSuccess;

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    setDownloading(true);
    const result = await downloadFile(file.fileName, file.keyName);
    setDownloading(false);
    if (result.success) {
      onDownloadSuccess?.(file.fileName);
    } else {
      onDownloadError?.(file.fileName, result.error || 'Unknown error');
    }
  }

  async function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    const newValue = !starred;
    setStarred(newValue);
    const result = await toggleStar(file.fileName, newValue);
    if (result.success) {
      onStarToggle?.(file.fileName, newValue);
    } else {
      setStarred(!newValue);
    }
  }

  async function handleLock(e: React.MouseEvent) {
    e.stopPropagation();
    if (protected_) {
      setUnlockOpen(true);
    } else {
      setProtected(true);
      const result = await toggleProtection(file.fileName, true);
      if (result.success) {
        onProtectionChange?.(file.fileName, true);
      } else {
        setProtected(false);
      }
    }
  }

  async function confirmUnlock() {
    setUnlockOpen(false);
    setProtected(false);
    const result = await toggleProtection(file.fileName, false);
    if (result.success) {
      onProtectionChange?.(file.fileName, false);
    } else {
      setProtected(true);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    if (isLocalDelete) {
      const result = await deleteLocalFile(file.fileName);
      setDeleting(false);
      if (result.success) onDeleteLocalSuccess?.(file.fileName);
      else onDeleteLocalError?.(file.fileName, result.error || 'Unknown error');
    } else {
      const result = await deleteFile(file.fileName, file.keyName);
      setDeleting(false);
      if (result.success) onDeleteSuccess?.(file.fileName);
      else onDeleteError?.(file.fileName, result.error || 'Unknown error');
    }
  }

  function handleClick() {
    if (onFileOpen && !confirmOpen && !deleting) {
      onFileOpen(file.fileName);
    }
  }

  return (
    <div
      onClick={handleClick}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', file.fileName); e.dataTransfer.effectAllowed = 'move'; }}
      className="group relative border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all flex flex-col h-full"
    >
      {/* Persistent badges (star, lock) */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5">
        {starred && <AiFillStar className="w-3.5 h-3.5 text-yellow-400" />}
        {protected_ && <AiOutlineLock className="w-3.5 h-3.5 text-amber-500" />}
      </div>

      {/* File icon centered */}
      <div className="flex items-center justify-center py-5">
        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>

      {/* File name */}
      <p className="text-sm text-gray-800 font-medium text-center truncate w-full px-1" title={file.fileName}>
        {file.fileName}
      </p>

      {/* Date + size footer */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>{formatDate(file.uploadDate)}</span>
        <span>{formatSize(file.size)}</span>
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border-t border-gray-100 rounded-b-xl px-2 py-1.5 flex items-center justify-center gap-1">
        {onPreviewClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreviewClick(file.fileName, file.keyName); }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Preview"
          >
            <AiOutlineEye className="w-3.5 h-3.5 text-gray-600" />
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
              <AiOutlineLoading3Quarters className="w-3.5 h-3.5 text-gray-600 animate-spin" />
            ) : (
              <AiOutlineDownload className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>
        )}
        {onRotateClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onRotateClick(file.fileName, file.keyName); }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Rotate key"
          >
            <AiOutlineSync className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
        {onMoveClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveClick(file.fileName, file.folder || '/'); }}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title="Move to folder"
          >
            <AiOutlineFolderOpen className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
        {!isLocalDelete && (
          <button
            onClick={handleStar}
            className="p-1.5 rounded-md cursor-pointer transition-colors group/star"
            title={starred ? 'Unstar' : 'Star'}
          >
            {starred ? <AiFillStar className="w-3.5 h-3.5 text-yellow-400" /> : <AiOutlineStar className="w-3.5 h-3.5 text-gray-600 group-hover/star:text-yellow-400" />}
          </button>
        )}
        {!isLocalDelete && (
          <button
            onClick={handleLock}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
            title={protected_ ? 'Remove protection' : 'Protect'}
          >
            {protected_ ? <AiOutlineLock className="w-3.5 h-3.5 text-amber-500" /> : <AiOutlineUnlock className="w-3.5 h-3.5 text-gray-600" />}
          </button>
        )}
        {!protected_ ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer transition-colors"
            title={isLocalDelete ? 'Remove from local' : 'Delete'}
          >
            {deleting ? (
              <AiOutlineLoading3Quarters className="w-3.5 h-3.5 text-red-500 animate-spin" />
            ) : (
              <AiOutlineDelete className="w-3.5 h-3.5 text-red-500" />
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
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
