import { useState, useEffect, useCallback } from 'react';
import { getFolders, createFolder, deleteFolder as deleteFolderApi, moveFile as moveFileApi, moveFolderInto } from '../services/api';

export function useFolders(addToast: (type: 'success' | 'error', message: string) => void, refetch: () => void) {
  const [folders, setFolders] = useState<string[]>(['/']);

  const refetchFolders = useCallback(async () => {
    const f = await getFolders();
    setFolders(f);
  }, []);

  useEffect(() => {
    refetchFolders();
  }, [refetchFolders]);

  const handleCreateFolder = useCallback(async (folderName: string) => {
    const normalized = folderName.startsWith('/') ? folderName : '/' + folderName;
    const result = await createFolder(normalized);
    if (result.success) {
      addToast('success', `Folder "${result.folder}" created`);
      refetchFolders();
    } else {
      addToast('error', result.error || 'Failed to create folder');
    }
  }, [addToast, refetchFolders]);

  const handleDeleteFolder = useCallback(async (folder: string) => {
    const result = await deleteFolderApi(folder);
    if (result.success) {
      addToast('success', `Folder "${folder}" deleted`);
      refetchFolders();
    } else {
      addToast('error', result.error || 'Failed to delete folder');
    }
    return result.success;
  }, [addToast, refetchFolders]);

  const handleFileDrop = useCallback(async (fileName: string, targetFolder: string) => {
    const result = await moveFileApi(fileName, targetFolder);
    if (result.success) {
      addToast('success', `Moved "${fileName}" to ${targetFolder}`);
      refetch();
    } else {
      addToast('error', `Failed to move "${fileName}": ${result.error}`);
    }
  }, [addToast, refetch]);

  const handleFolderDrop = useCallback(async (sourceFolder: string, targetFolder: string) => {
    const result = await moveFolderInto(sourceFolder, targetFolder);
    if (result.success) {
      addToast('success', `Moved folder to ${result.newPath}`);
      refetchFolders();
      refetch();
    } else {
      addToast('error', `Failed to move folder: ${result.error}`);
    }
  }, [addToast, refetchFolders, refetch]);

  return { folders, refetchFolders, handleCreateFolder, handleDeleteFolder, handleFileDrop, handleFolderDrop };
}
