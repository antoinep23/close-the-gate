import { useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar, AiOutlineDelete, AiOutlineSync, AiOutlineLock, AiOutlineUnlock, AiOutlineEye, AiOutlineFolderOpen } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { downloadFile, toggleStar, deleteFile, deleteLocalFile, toggleProtection } from '../services/api';
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
  onMoveClick?: (fileName: string, folder: string) => void;
  onProtectionChange?: (fileName: string, isProtected: boolean) => void;
  hideDownload?: boolean;
}

export function FileRow({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, onRotateClick, onPreviewClick, onMoveClick, onProtectionChange, hideDownload }: FileRowProps) {
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
      // Open unlock confirm modal
      setUnlockOpen(true);
    } else {
      // Lock immediately
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
      if (result.success) {
        onDeleteLocalSuccess?.(file.fileName);
      } else {
        onDeleteLocalError?.(file.fileName, result.error || 'Unknown error');
      }
    } else {
      const result = await deleteFile(file.fileName, file.keyName);
      setDeleting(false);
      if (result.success) {
        onDeleteSuccess?.(file.fileName);
      } else {
        onDeleteError?.(file.fileName, result.error || 'Unknown error');
      }
    }
  }

  function handleClick() {
    if (onFileOpen && !confirmOpen && !deleting) {
      onFileOpen(file.fileName);
    }
  }

  return (
    <>
      <tr
        onClick={handleClick}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', file.fileName); e.dataTransfer.effectAllowed = 'move'; }}
        className="group border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <td className="py-2.5">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <span className="text-sm text-gray-800">{file.fileName}</span>
          </div>
        </td>
        <td className="py-2.5 text-sm text-gray-500">{formatDate(file.uploadDate)}</td>
        <td className="py-2.5 text-sm text-gray-500">{formatSize(file.size)}</td>
        {onPreviewClick && (
          <td className="py-2.5">
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
          <td className="py-2.5">
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
          <td className="py-2.5">
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
        {onMoveClick && (
          <td className="py-2.5">
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
        {!isLocalDelete && (
          <td className="py-2.5">
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
          <td className="py-2.5">
            <button
              onClick={handleLock}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                protected_
                  ? 'text-amber-500 hover:bg-gray-200'
                  : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label={protected_ ? 'Unlock deletion' : 'Lock deletion'}
              title={protected_ ? 'Remove deletion protection' : 'Protect from deletion'}
            >
              {protected_ ? <AiOutlineLock className="w-4 h-4" /> : <AiOutlineUnlock className="w-4 h-4" />}
            </button>
          </td>
        )}
        <td className="py-2.5">
          {!protected_ ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-50 cursor-pointer transition-all"
              aria-label={`Delete ${file.fileName}`}
              title={isLocalDelete ? 'Remove from local' : 'Delete from cloud bucket'}
            >
              {deleting ? (
                <AiOutlineLoading3Quarters className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <AiOutlineDelete className="w-4 h-4 text-red-500" />
              )}
            </button>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 px-1 mt-1 inline-block" title="Deletion protected">
              <AiOutlineDelete className="w-4 h-4 text-gray-200" />
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
