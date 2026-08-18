import { useState, useMemo } from 'react';
import type { FileItem } from '../data/mockFiles';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';

type SortField = 'uploadDate' | 'size';
type SortDirection = 'asc' | 'desc';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
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

function SortArrow({ field, activeField, direction }: { field: SortField; activeField: SortField | null; direction: SortDirection }) {
  const isActive = field === activeField;
  return (
    <span className="inline-flex flex-col ml-2 -space-y-0.5">
      <svg
        className={`w-2.5 h-2.5 ${isActive && direction === 'desc' ? 'text-gray-500' : 'text-gray-300'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 ${isActive && direction === 'asc' ? 'text-gray-500' : 'text-gray-300'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

export function FileGrid({ files, viewMode, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, hideDownload }: FileGridProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  function handleSort(field: SortField) {
    if (sortField === field) {
      // Toggle direction
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  const sortedFiles = useMemo(() => {
    if (!sortField) return files;

    return [...files].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'size') {
        cmp = a.size - b.size;
      } else if (sortField === 'uploadDate') {
        cmp = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [files, sortField, sortDirection]);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No files found</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="pb-2 font-medium">Name</th>
              <th
                className="pb-2 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors"
                onClick={() => handleSort('uploadDate')}
              >
                <span className="inline-flex items-center">
                  {hideDownload ? 'Download date' : 'Upload date'}
                  <SortArrow field="uploadDate" activeField={sortField} direction={sortDirection} />
                </span>
              </th>
              <th
                className="pb-2 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors"
                onClick={() => handleSort('size')}
              >
                <span className="inline-flex items-center">
                  Size
                  <SortArrow field="size" activeField={sortField} direction={sortDirection} />
                </span>
              </th>
              <th className="pb-2 font-medium w-10"></th>
              {!hideDownload && <th className="pb-2 font-medium w-10"></th>}
              <th className="pb-2 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => (
              <FileRow
                key={file.fileName}
                file={file}
                onDownloadSuccess={onDownloadSuccess}
                onDownloadError={onDownloadError}
                onFileOpen={onFileOpen}
                onStarToggle={onStarToggle}
                onDeleteSuccess={onDeleteSuccess}
                onDeleteError={onDeleteError}
                onDeleteLocalSuccess={onDeleteLocalSuccess}
                onDeleteLocalError={onDeleteLocalError}
                hideDownload={hideDownload}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sortedFiles.map((file) => (
          <FileCard
            key={file.fileName}
            file={file}
            onDownloadSuccess={onDownloadSuccess}
            onDownloadError={onDownloadError}
            onFileOpen={onFileOpen}
            onStarToggle={onStarToggle}
            onDeleteSuccess={onDeleteSuccess}
            onDeleteError={onDeleteError}
            onDeleteLocalSuccess={onDeleteLocalSuccess}
            onDeleteLocalError={onDeleteLocalError}
            hideDownload={hideDownload}
          />
        ))}
      </div>
    </div>
  );
}
