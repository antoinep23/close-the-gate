import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';

interface FileRowProps {
  file: FileItem;
}

export function FileRow({ file }: FileRowProps) {
  const { icon: Icon, color } = getFileIcon(file);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
      <td className="py-2.5">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <span className="text-sm text-gray-800">{file.name}</span>
        </div>
      </td>
      <td className="py-2.5 text-sm text-gray-500">{formatDate(file.lastModified)}</td>
      <td className="py-2.5 text-sm text-gray-500">{formatSize(file.size)}</td>
    </tr>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
