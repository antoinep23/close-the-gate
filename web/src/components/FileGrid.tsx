import { useState, useMemo } from 'react';
import { AiFillFolder, AiOutlineDelete, AiOutlineFolderOpen } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { formatSize } from '../utils/format';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';

type SortField = 'uploadDate' | 'size';
type SortDirection = 'asc' | 'desc';

interface FileGridProps {
  files: FileItem[];
  subFolders?: string[];
  folderSizes?: Record<string, number>;
  viewMode: 'grid' | 'list';
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
  onFolderClick?: (folder: string) => void;
  onDeleteFolder?: (folder: string) => void;
  onMoveFolderClick?: (folder: string) => void;
  onFileDrop?: (fileName: string, targetFolder: string) => void;
  onFolderDrop?: (sourceFolder: string, targetFolder: string) => void;
  hideDownload?: boolean;
}

function SortArrow({ field, activeField, direction }: { field: SortField; activeField: SortField | null; direction: SortDirection }) {
  const isActive = field === activeField;
  return (
    <span className="inline-flex flex-col ml-1.5 -space-y-0.5">
      <svg
        className={`w-2 h-2 ${isActive && direction === 'asc' ? 'text-gray-700' : 'text-gray-300'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2 h-2 ${isActive && direction === 'desc' ? 'text-gray-700' : 'text-gray-300'}`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

export function FileGrid({ files, subFolders, folderSizes, viewMode, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, onRotateClick, onPreviewClick, onMoveClick, onProtectionChange, onFolderClick, onDeleteFolder, onMoveFolderClick, onFileDrop, onFolderDrop, hideDownload }: FileGridProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
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
      if (sortField === 'size') cmp = a.size - b.size;
      else if (sortField === 'uploadDate') cmp = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [files, sortField, sortDirection]);

  const sortedSubFolders = useMemo(() => {
    if (!subFolders) return undefined;
    if (sortField !== 'size' || !folderSizes) return subFolders;
    return [...subFolders].sort((a, b) => {
      const cmp = (folderSizes[a] || 0) - (folderSizes[b] || 0);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [subFolders, sortField, sortDirection, folderSizes]);

  const hasSubFolders = sortedSubFolders && sortedSubFolders.length > 0;

  if (files.length === 0 && !hasSubFolders) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm">No files here</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="px-6 pt-2">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[13px] text-gray-500 border-b border-gray-300">
              <th className="pb-3 font-medium">Name</th>
              <th
                className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors hidden md:table-cell"
                onClick={() => handleSort('uploadDate')}
              >
                <span className="inline-flex items-center">
                  {hideDownload ? 'Downloaded' : 'Date modified'}
                  <SortArrow field="uploadDate" activeField={sortField} direction={sortDirection} />
                </span>
              </th>
              <th
                className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors hidden md:table-cell"
                onClick={() => handleSort('size')}
              >
                <span className="inline-flex items-center">
                  File size
                  <SortArrow field="size" activeField={sortField} direction={sortDirection} />
                </span>
              </th>
              {onPreviewClick && <th className="pb-3 font-medium w-10"></th>}
              {!hideDownload && <th className="pb-3 font-medium w-10"></th>}
              {onRotateClick && <th className="pb-3 font-medium w-10"></th>}
              <th className="pb-3 font-medium w-10"></th>
              <th className="pb-3 font-medium w-10"></th>
              {onMoveClick && <th className="pb-3 font-medium w-10"></th>}
              <th className="pb-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {hasSubFolders && sortedSubFolders.map((folder) => {
              const name = folder.split('/').pop() || folder;
              return (
                <tr
                  key={`folder-${folder}`}
                  onClick={() => onFolderClick?.(folder)}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('application/x-folder', folder); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFolder(null);
                    const droppedFolder = e.dataTransfer.getData('application/x-folder');
                    if (droppedFolder && droppedFolder !== folder && onFolderDrop) {
                      onFolderDrop(droppedFolder, folder);
                    } else {
                      const fileName = e.dataTransfer.getData('text/plain');
                      if (fileName && onFileDrop) onFileDrop(fileName, folder);
                    }
                  }}
                  className={`group border-b border-gray-300 cursor-pointer transition-colors ${
                    dragOverFolder === folder
                      ? 'bg-blue-50 ring-1 ring-blue-200 ring-inset'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <AiFillFolder className="w-6 h-6 text-[#5f6368] flex-shrink-0" />
                      <span className="text-sm text-gray-800 font-medium">{name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">—</td>
                  <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">{folderSizes?.[folder] ? formatSize(folderSizes[folder]) : '—'}</td>
                  {onPreviewClick && <td className="py-3"></td>}
                  {!hideDownload && <td className="py-3"></td>}
                  {onRotateClick && <td className="py-3"></td>}
                  <td className="py-3"></td>
                  <td className="py-3"></td>
                  {onMoveClick && (
                    <td className="py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveFolderClick?.(folder); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-all"
                        title="Move folder"
                      >
                        <AiOutlineFolderOpen className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  )}
                  <td className="py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(folder); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-50 cursor-pointer transition-all"
                      title="Delete folder"
                    >
                      <AiOutlineDelete className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              );
            })}
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
                onRotateClick={onRotateClick}
                onPreviewClick={onPreviewClick}
                onMoveClick={onMoveClick}
                onProtectionChange={onProtectionChange}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-fr">
        {hasSubFolders && sortedSubFolders.map((folder) => {
          const name = folder.split('/').pop() || folder;
          return (
            <div
              key={`folder-${folder}`}
              onClick={() => onFolderClick?.(folder)}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('application/x-folder', folder); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolder(null);
                const droppedFolder = e.dataTransfer.getData('application/x-folder');
                if (droppedFolder && droppedFolder !== folder && onFolderDrop) {
                  onFolderDrop(droppedFolder, folder);
                } else {
                  const fileName = e.dataTransfer.getData('text/plain');
                  if (fileName && onFileDrop) onFileDrop(fileName, folder);
                }
              }}
              className={`group relative rounded-xl p-4 cursor-pointer transition-all flex flex-col h-full ${
                dragOverFolder === folder
                  ? 'bg-blue-50 ring-1 ring-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2 flex-1 py-4">
                <AiFillFolder className="w-10 h-10 text-[#5f6368]" />
                <span className="text-sm text-gray-800 font-medium truncate max-w-full px-1">{name}</span>
                {folderSizes?.[folder] ? (
                  <span className="text-[11px] text-gray-400">{formatSize(folderSizes[folder])}</span>
                ) : null}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveFolderClick?.(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
                  title="Move folder"
                >
                  <AiOutlineFolderOpen className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
                  title="Delete folder"
                >
                  <AiOutlineDelete className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>
          );
        })}
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
            onRotateClick={onRotateClick}
            onPreviewClick={onPreviewClick}
            onMoveClick={onMoveClick}
            onProtectionChange={onProtectionChange}
            hideDownload={hideDownload}
          />
        ))}
      </div>
    </div>
  );
}
