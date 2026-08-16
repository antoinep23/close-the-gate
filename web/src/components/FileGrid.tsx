import type { FileItem } from '../data/mockFiles';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (fileName: string, error: string) => void;
  onFileOpen?: (fileName: string) => void;
  hideDownload?: boolean;
}

export function FileGrid({ files, viewMode, onDownloadSuccess, onDownloadError, onFileOpen, hideDownload }: FileGridProps) {
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
              <th className="pb-2 font-medium">Upload date</th>
              <th className="pb-2 font-medium">Size</th>
              {!hideDownload && <th className="pb-2 font-medium w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <FileRow
                key={file.fileName}
                file={file}
                onDownloadSuccess={onDownloadSuccess}
                onDownloadError={onDownloadError}
                onFileOpen={onFileOpen}
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
        {files.map((file) => (
          <FileCard
            key={file.fileName}
            file={file}
            onDownloadSuccess={onDownloadSuccess}
            onDownloadError={onDownloadError}
            onFileOpen={onFileOpen}
            hideDownload={hideDownload}
          />
        ))}
      </div>
    </div>
  );
}
