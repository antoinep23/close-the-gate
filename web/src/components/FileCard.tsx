import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';

interface FileCardProps {
  file: FileItem;
}

export function FileCard({ file }: FileCardProps) {
  const { icon: Icon, color } = getFileIcon(file);

  return (
    <div className="group border border-gray-200 rounded-xl p-3 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all">
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 ${color}`} />
        <span className="text-sm text-gray-800 truncate">{file.name}</span>
      </div>
      {file.type === 'file' && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{formatDate(file.lastModified)}</span>
          <span>{formatSize(file.size)}</span>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
