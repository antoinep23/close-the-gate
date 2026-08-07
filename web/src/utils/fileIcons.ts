import type { IconType } from 'react-icons';
import {
  AiOutlineFolder,
  AiOutlineFileText,
  AiOutlineFilePdf,
  AiOutlineFileImage,
  AiOutlineFileExcel,
  AiOutlineFilePpt,
  AiOutlineCode,
  AiOutlinePlayCircle,
  AiOutlineFile,
} from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';

interface FileIconResult {
  icon: IconType;
  color: string;
}

export function getFileIcon(file: FileItem): FileIconResult {
  if (file.type === 'folder') {
    return { icon: AiOutlineFolder, color: 'text-gray-600' };
  }

  const mime = file.mimeType || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/')) {
    return { icon: AiOutlineFileImage, color: 'text-red-500' };
  }
  if (mime === 'application/pdf') {
    return { icon: AiOutlineFilePdf, color: 'text-red-600' };
  }
  if (mime.includes('spreadsheet') || ext === 'csv') {
    return { icon: AiOutlineFileExcel, color: 'text-green-600' };
  }
  if (mime.includes('presentation')) {
    return { icon: AiOutlineFilePpt, color: 'text-orange-500' };
  }
  if (mime.startsWith('video/') || mime.startsWith('audio/')) {
    return { icon: AiOutlinePlayCircle, color: 'text-purple-500' };
  }
  if (mime.startsWith('text/') || ['md', 'txt', 'log'].includes(ext)) {
    return { icon: AiOutlineFileText, color: 'text-blue-500' };
  }
  if (['json', 'js', 'ts', 'py', 'sh', 'yaml', 'yml', 'toml'].includes(ext)) {
    return { icon: AiOutlineCode, color: 'text-yellow-600' };
  }

  return { icon: AiOutlineFile, color: 'text-gray-500' };
}
