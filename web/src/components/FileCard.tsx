import { useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar, AiOutlineDelete } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { downloadFile, toggleStar, deleteFile, deleteLocalFile } from '../services/api';
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
  hideDownload?: boolean;
}

export function FileCard({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, hideDownload }: FileCardProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starred, setStarred] = useState(file.isStarred);

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
    <div
      onClick={handleClick}
      className="group relative border border-gray-200 rounded-xl p-3 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 ${color}`} />
        <span className="text-sm text-gray-800 truncate flex-1">{file.fileName}</span>
        <div className="flex items-center gap-1">
          {!isLocalDelete && (
            <button
              onClick={handleStar}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                starred ? 'text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'
              }`}
              aria-label={starred ? 'Unstar' : 'Star'}
              title={starred ? 'Unstar' : 'Star'}
            >
              {starred ? <AiFillStar className="w-4 h-4" /> : <AiOutlineStar className="w-4 h-4" />}
            </button>
          )}
          {!hideDownload && (
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
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 cursor-pointer transition-all"
            aria-label={`Delete ${file.fileName}`}
            title={isLocalDelete ? 'Remove from local' : 'Delete from cloud bucket'}
          >
            {deleting ? (
              <AiOutlineLoading3Quarters className="w-4 h-4 text-red-500 animate-spin" />
            ) : (
              <AiOutlineDelete className="w-4 h-4 text-red-500" />
            )}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(file.uploadDate)}</span>
        <span>{formatSize(file.size)}</span>
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
