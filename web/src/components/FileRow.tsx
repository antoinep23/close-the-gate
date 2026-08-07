import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatSize } from '../utils/format';

interface FileRowProps {
  file: FileItem;
}

export function FileRow({ file }: FileRowProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
      <td className="py-2.5">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <span className="text-sm text-gray-800">{file.fileName}</span>
        </div>
      </td>
      <td className="py-2.5 text-sm text-gray-500">{formatDate(file.uploadDate)}</td>
      <td className="py-2.5 text-sm text-gray-500">{formatSize(file.size)}</td>
    </tr>
  );
}
