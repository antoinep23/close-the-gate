import type { FileItem } from '../data/mockFiles';
import { FileCard } from './FileCard';
import { FileRow } from './FileRow';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
}

export function FileGrid({ files, viewMode }: FileGridProps) {
  const folders = files.filter((f) => f.type === 'folder');
  const regularFiles = files.filter((f) => f.type === 'file');

  if (viewMode === 'list') {
    return (
      <div className="p-6">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Last modified</th>
              <th className="pb-2 font-medium">File size</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
            {regularFiles.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      {folders.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
            {folders.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </>
      )}
      {regularFiles.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Files</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {regularFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
