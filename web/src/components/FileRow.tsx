import { AiOutlineDownload, AiOutlineLoading3Quarters, AiOutlineStar, AiFillStar, AiOutlineDelete, AiOutlineSync, AiOutlineLock, AiOutlineUnlock, AiOutlineEye, AiOutlineFolderOpen } from 'react-icons/ai';
import type { FileItem } from '../data/mockFiles';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatSize } from '../utils/format';
import { useFileActions } from '../hooks/useFileActions';
import { ConfirmModal } from './ConfirmModal';

interface FileRowProps {
  file: FileItem;
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
  hideDownload?: boolean;
}

export function FileRow({ file, onDownloadSuccess, onDownloadError, onFileOpen, onStarToggle, onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError, onRotateClick, onPreviewClick, onMoveClick, onProtectionChange, hideDownload }: FileRowProps) {
  const { icon: Icon, color } = getFileIcon(file.fileName);
  const {
    downloading, deleting, confirmOpen, setConfirmOpen, unlockOpen, setUnlockOpen,
    starred, isProtected, isLocalDelete,
    handleDownload, handleStar, handleLock, confirmUnlock, handleDelete, confirmDelete,
  } = useFileActions(file, {
    onDownloadSuccess, onDownloadError, onStarToggle,
    onDeleteSuccess, onDeleteError, onDeleteLocalSuccess, onDeleteLocalError,
    onProtectionChange,
  });

  function handleClick() {
    if (onFileOpen && !confirmOpen && !deleting) {
      onFileOpen(file.fileName);
    }
  }

  return (
    <>
      <tr
        onClick={handleClick}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', file.fileName); e.dataTransfer.effectAllowed = 'move'; }}
        className="group border-b border-gray-300 hover:bg-gray-100 transition-colors"
      >
        <td className="py-3 px-2">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <span className="text-sm text-gray-800">{file.fileName}</span>
          </div>
        </td>
        <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">{formatDate(file.uploadDate)}</td>
        <td className="py-3 text-[13px] text-gray-500 hidden md:table-cell">{formatSize(file.size)}</td>
        {onPreviewClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onPreviewClick(file.fileName, file.keyName); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Preview ${file.fileName}`}
              title="Preview"
            >
              <AiOutlineEye className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        {!hideDownload && (
          <td className="py-3">
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
        {onRotateClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onRotateClick(file.fileName, file.keyName); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Rotate key for ${file.fileName}`}
              title="Rotate key"
            >
              <AiOutlineSync className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        {!isLocalDelete && (
          <td className="py-3">
            <button
              onClick={handleStar}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                starred ? 'text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-yellow-400'
              }`}
              aria-label={starred ? 'Unstar' : 'Star'}
              title={starred ? 'Unstar' : 'Star'}
            >
              {starred ? <AiFillStar className="w-4 h-4" /> : <AiOutlineStar className="w-4 h-4" />}
            </button>
          </td>
        )}
        {!isLocalDelete && (
          <td className="py-3">
            <button
              onClick={handleLock}
              className={`p-1 rounded-full cursor-pointer transition-all ${
                isProtected
                  ? 'text-amber-500 hover:bg-gray-200'
                  : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label={isProtected ? 'Unlock deletion' : 'Lock deletion'}
              title={isProtected ? 'Remove deletion protection' : 'Protect from deletion'}
            >
              {isProtected ? <AiOutlineLock className="w-4 h-4" /> : <AiOutlineUnlock className="w-4 h-4" />}
            </button>
          </td>
        )}
        {onMoveClick && (
          <td className="py-3">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveClick(file.fileName, file.folder || '/'); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-all"
              aria-label={`Move ${file.fileName}`}
              title="Move to folder"
            >
              <AiOutlineFolderOpen className="w-4 h-4 text-gray-500" />
            </button>
          </td>
        )}
        <td className="py-3">
          {!isProtected ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full cursor-pointer transition-all"
              aria-label={`Delete ${file.fileName}`}
              title={isLocalDelete ? 'Remove from local' : 'Delete from cloud bucket'}
            >
              {deleting ? (
                <AiOutlineLoading3Quarters className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <AiOutlineDelete className="w-4 h-4 text-gray-500 hover:text-red-500" />
              )}
            </button>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 px-1 mt-1 inline-block" title="Deletion protected">
              <AiOutlineDelete className="w-4 h-4 text-gray-300" />
            </span>
          )}
        </td>
      </tr>
      <ConfirmModal
        isOpen={confirmOpen}
        title={isLocalDelete ? 'Remove local file' : 'Delete file'}
        message={isLocalDelete
          ? `Remove "${file.fileName}" from local downloads?`
          : `"${file.fileName}" will be permanently deleted from the cloud bucket. This cannot be undone.`
        }
        confirmLabel={isLocalDelete ? 'Remove' : 'Delete'}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmModal
        isOpen={unlockOpen}
        title="Remove deletion protection"
        message={`This file is protected from deletion. To remove protection, type the confirmation text below.`}
        confirmLabel="Unlock"
        confirmText={`unlock ${file.fileName}`}
        onConfirm={confirmUnlock}
        onCancel={() => setUnlockOpen(false)}
      />
    </>
  );
}
