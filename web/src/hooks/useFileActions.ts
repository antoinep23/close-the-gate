import { useState } from 'react';
import type { FileItem } from '../data/mockFiles';
import { downloadFile, toggleStar, deleteFile, deleteLocalFile, toggleProtection } from '../services/api';

interface FileActionCallbacks {
  onDownloadSuccess?: (fileName: string) => void;
  onDownloadError?: (fileName: string, error: string) => void;
  onStarToggle?: (fileName: string, isStarred: boolean) => void;
  onDeleteSuccess?: (fileName: string) => void;
  onDeleteError?: (fileName: string, error: string) => void;
  onDeleteLocalSuccess?: (fileName: string) => void;
  onDeleteLocalError?: (fileName: string, error: string) => void;
  onProtectionChange?: (fileName: string, isProtected: boolean) => void;
}

export function useFileActions(file: FileItem, callbacks: FileActionCallbacks) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [starred, setStarred] = useState(file.isStarred);
  const [isProtected, setProtected] = useState(file.isProtected);

  const isLocalDelete = !!callbacks.onDeleteLocalSuccess;

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    setDownloading(true);
    const result = await downloadFile(file.fileName, file.keyName);
    setDownloading(false);
    if (result.success) {
      callbacks.onDownloadSuccess?.(file.fileName);
    } else {
      callbacks.onDownloadError?.(file.fileName, result.error || 'Unknown error');
    }
  }

  async function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    const newValue = !starred;
    setStarred(newValue);
    const result = await toggleStar(file.fileName, newValue);
    if (result.success) {
      callbacks.onStarToggle?.(file.fileName, newValue);
    } else {
      setStarred(!newValue);
    }
  }

  async function handleLock(e: React.MouseEvent) {
    e.stopPropagation();
    if (isProtected) {
      setUnlockOpen(true);
    } else {
      setProtected(true);
      const result = await toggleProtection(file.fileName, true);
      if (result.success) {
        callbacks.onProtectionChange?.(file.fileName, true);
      } else {
        setProtected(false);
      }
    }
  }

  async function confirmUnlock() {
    setUnlockOpen(false);
    setProtected(false);
    const result = await toggleProtection(file.fileName, false);
    if (result.success) {
      callbacks.onProtectionChange?.(file.fileName, false);
    } else {
      setProtected(true);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    if (isLocalDelete) {
      const result = await deleteLocalFile(file.fileName);
      setDeleting(false);
      if (result.success) {
        callbacks.onDeleteLocalSuccess?.(file.fileName);
      } else {
        callbacks.onDeleteLocalError?.(file.fileName, result.error || 'Unknown error');
      }
    } else {
      const result = await deleteFile(file.fileName, file.keyName);
      setDeleting(false);
      if (result.success) {
        callbacks.onDeleteSuccess?.(file.fileName);
      } else {
        callbacks.onDeleteError?.(file.fileName, result.error || 'Unknown error');
      }
    }
  }

  return {
    downloading,
    deleting,
    confirmOpen,
    setConfirmOpen,
    unlockOpen,
    setUnlockOpen,
    starred,
    isProtected,
    isLocalDelete,
    handleDownload,
    handleStar,
    handleLock,
    confirmUnlock,
    handleDelete,
    confirmDelete,
  };
}
