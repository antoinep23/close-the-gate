import type { IconType } from 'react-icons';
import {
  AiOutlineFileText,
  AiOutlineFilePdf,
  AiOutlineFileImage,
  AiOutlineFileExcel,
  AiOutlineFilePpt,
  AiOutlineCode,
  AiOutlinePlayCircle,
  AiOutlineFile,
  AiOutlineFileZip,
} from 'react-icons/ai';

interface FileIconResult {
  icon: IconType;
  color: string;
}

const extensionMap: Record<string, FileIconResult> = {
  // Images
  png: { icon: AiOutlineFileImage, color: 'text-red-500' },
  jpg: { icon: AiOutlineFileImage, color: 'text-red-500' },
  jpeg: { icon: AiOutlineFileImage, color: 'text-red-500' },
  gif: { icon: AiOutlineFileImage, color: 'text-red-500' },
  svg: { icon: AiOutlineFileImage, color: 'text-red-500' },
  webp: { icon: AiOutlineFileImage, color: 'text-red-500' },
  // PDF
  pdf: { icon: AiOutlineFilePdf, color: 'text-red-600' },
  // Spreadsheets
  xlsx: { icon: AiOutlineFileExcel, color: 'text-green-600' },
  xls: { icon: AiOutlineFileExcel, color: 'text-green-600' },
  csv: { icon: AiOutlineFileExcel, color: 'text-green-600' },
  // Presentations
  pptx: { icon: AiOutlineFilePpt, color: 'text-orange-500' },
  ppt: { icon: AiOutlineFilePpt, color: 'text-orange-500' },
  // Video/Audio
  mp4: { icon: AiOutlinePlayCircle, color: 'text-purple-500' },
  mov: { icon: AiOutlinePlayCircle, color: 'text-purple-500' },
  avi: { icon: AiOutlinePlayCircle, color: 'text-purple-500' },
  mp3: { icon: AiOutlinePlayCircle, color: 'text-purple-500' },
  wav: { icon: AiOutlinePlayCircle, color: 'text-purple-500' },
  // Text/Docs
  md: { icon: AiOutlineFileText, color: 'text-blue-500' },
  txt: { icon: AiOutlineFileText, color: 'text-blue-500' },
  doc: { icon: AiOutlineFileText, color: 'text-blue-500' },
  docx: { icon: AiOutlineFileText, color: 'text-blue-500' },
  log: { icon: AiOutlineFileText, color: 'text-blue-500' },
  // Code
  json: { icon: AiOutlineCode, color: 'text-yellow-600' },
  js: { icon: AiOutlineCode, color: 'text-yellow-600' },
  ts: { icon: AiOutlineCode, color: 'text-yellow-600' },
  tsx: { icon: AiOutlineCode, color: 'text-yellow-600' },
  jsx: { icon: AiOutlineCode, color: 'text-yellow-600' },
  py: { icon: AiOutlineCode, color: 'text-yellow-600' },
  sh: { icon: AiOutlineCode, color: 'text-yellow-600' },
  yaml: { icon: AiOutlineCode, color: 'text-yellow-600' },
  yml: { icon: AiOutlineCode, color: 'text-yellow-600' },
  toml: { icon: AiOutlineCode, color: 'text-yellow-600' },
  html: { icon: AiOutlineCode, color: 'text-yellow-600' },
  css: { icon: AiOutlineCode, color: 'text-yellow-600' },
  // Archives
  zip: { icon: AiOutlineFileZip, color: 'text-gray-600' },
  tar: { icon: AiOutlineFileZip, color: 'text-gray-600' },
  gz: { icon: AiOutlineFileZip, color: 'text-gray-600' },
  rar: { icon: AiOutlineFileZip, color: 'text-gray-600' },
};

const defaultIcon: FileIconResult = { icon: AiOutlineFile, color: 'text-gray-500' };

export function getFileIcon(fileName: string): FileIconResult {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return extensionMap[ext] || defaultIcon;
}
