import { useState } from 'react';
import { AiOutlineDownload, AiOutlineLoading3Quarters } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { downloadFile } from '../services/api';

interface FileRowProps {
  file: FileItem;
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (fileName: string, error: string) => void;
  onFileOpen?: (fileName: string) => void;
  hideDownload?: boolean;
}

export function FileRow({ file, onDownloadSuccess, onDownloadError, onFileOpen, hideDownload }: FileRowProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const [downloading, setDownloading] = useState(false);

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

  function handleClick() {
    if (onFileOpen) {
      onFileOpen(file.fileName);
    }
  }

  return (
    <tr onClick={handleClick} className="group border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
      <td className="py-2.5">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <span className="text-sm text-gray-800">{file.fileName}</span>
        </div>
      </td>
      <td className="py-2.5 text-sm text-gray-500">{formatDate(file.uploadDate)}</td>
      <td className="py-2.5 text-sm text-gray-500">{formatSize(file.size)}</td>
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
    </tr>
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
