import { useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { downloadFile, toggleStar } from '../services/api';

interface FileCardProps {
  file: FileItem;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (fileName: string, error: string) => void;
  onFileOpen?: (fileName: string) => void;
  onStarToggle?: (fileName: string, isStarred: boolean) => void;
  hideDownload?: boolean;
}

export function FileCard({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, hideDownload }: FileCardProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const [downloading, setDownloading] = useState(false);
  const [starred, setStarred] = useState(file.isStarred);

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
      setStarred(!newValue); // revert on failure
    }
  }

  function handleClick() {
    if (onFileOpen) {
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
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(file.uploadDate)}</span>
        <span>{formatSize(file.size)}</span>
      </div>
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
