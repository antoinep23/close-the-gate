import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { LogViewer } from './components/LogViewer';
import { RotationBanner } from './components/RotationBanner';
import { FolderBreadcrumb } from './components/FolderBreadcrumb';
import { UnlockBanner } from './components/UnlockBanner';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { KeyGenModal } from './components/KeyGenModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/Toast';
import { BackupKeysModal } from './components/BackupKeysModal';
import { RotateKeyModal } from './components/RotateKeyModal';
import { PreviewModal } from './components/PreviewModal';
import { MoveFileModal } from './components/MoveFileModal';
import { MoveFolderModal } from './components/MoveFolderModal';
import { EmergencyRotationModal } from './components/EmergencyRotationModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { useFiles } from './hooks/useFiles';
import { useSettings } from './hooks/useSettings';
import { useKeys } from './hooks/useKeys';
import { useToasts } from './hooks/useToasts';
import { useLockStatus } from './hooks/useLockStatus';
import { useFolders } from './hooks/useFolders';
import { useCapabilities } from './hooks/useCapabilities';
import { openFile, deleteKey, renameFile, renameFolder } from './services/api';
import { getFileCategory } from './utils/fileIcons';
import { getSectionTitle, getSubFolders, computeFolderSizes } from './utils/folders';
import type { FileCategory } from './utils/fileIcons';
import type { FileItem } from './data/mockFiles';

function App() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('my-drive');
  const [currentFolder, setCurrentFolder] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal visibility state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [keyGenOpen, setKeyGenOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [rotateFile, setRotateFile] = useState<{ fileName: string; keyName: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ fileName: string; keyName: string } | null>(null);
  const [moveFile, setMoveFile] = useState<{ fileName: string; folder: string } | null>(null);
  const [emergencyRotationOpen, setEmergencyRotationOpen] = useState(false);
  const [moveFolderSource, setMoveFolderSource] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  // Downloaded files (local section)
  const [downloadedFiles, setDownloadedFiles] = useState<FileItem[]>([]);

  // Hooks
  const { toasts, addToast, dismissToast } = useToasts();
  const { files, loading, error, updateFileStar, refetch } = useFiles();
  const { settings, saveSettings } = useSettings();
  const { keys, refetchKeys } = useKeys();
  const { lockStatus, handleLock, handleUnlockSuccess, handleHighSecurityToggle } = useLockStatus(refetchKeys, addToast, saveSettings);
  const { folders, refetchFolders, handleCreateFolder, handleDeleteFolder, handleFileDrop, handleFolderDrop } = useFolders(addToast, refetch);
  const { canOpenFiles } = useCapabilities();

  // Fetch downloaded files
  const fetchDownloaded = useCallback(async () => {
    try {
      const res = await fetch('/api/downloaded');
      if (!res.ok) return;
      const data = await res.json();
      setDownloadedFiles(
        data.map((f: { fileName: string; size: number; downloadedAt: number }) => ({
          fileName: f.fileName,
          size: f.size,
          uploadDate: new Date(f.downloadedAt).toISOString(),
          isStarred: false,
          isProtected: false,
          folder: '/',
          lastOpenedAt: null,
          keyName: '',
        }))
      );
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    if (activeSection === 'downloaded') fetchDownloaded();
  }, [activeSection, fetchDownloaded]);

  // File action callbacks
  const onDownloadSuccess = useCallback((fileName: string) => {
    addToast('success', `Downloaded "${fileName}" successfully`);
    fetchDownloaded();
  }, [addToast, fetchDownloaded]);

  const onDownloadError = useCallback((fileName: string, err: string) => {
    addToast('error', `Failed to download "${fileName}": ${err}`);
  }, [addToast]);

  const onFileOpen = useCallback(async (fileName: string) => {
    const result = await openFile(fileName);
    if (!result.success) addToast('error', `Failed to open "${fileName}": ${result.error}`);
  }, [addToast]);

  const onStarToggle = useCallback((fileName: string, isStarred: boolean) => {
    updateFileStar(fileName, isStarred);
  }, [updateFileStar]);

  const onDeleteSuccess = useCallback((fileName: string) => {
    addToast('success', `Deleted "${fileName}" from cloud bucket`);
    refetch();
  }, [addToast, refetch]);

  const onDeleteError = useCallback((fileName: string, err: string) => {
    addToast('error', `Failed to delete "${fileName}": ${err}`);
  }, [addToast]);

  const onUploadSuccess = useCallback((fileName: string) => {
    addToast('success', `Uploaded "${fileName}" successfully`);
    refetch();
  }, [addToast, refetch]);

  const onUploadError = useCallback((fileName: string, err: string) => {
    addToast('error', `Failed to upload "${fileName}": ${err}`);
  }, [addToast]);

  const onDeleteLocalSuccess = useCallback((fileName: string) => {
    addToast('success', `Removed "${fileName}" from local`);
    fetchDownloaded();
  }, [addToast, fetchDownloaded]);

  const onDeleteLocalError = useCallback((fileName: string, err: string) => {
    addToast('error', `Failed to remove "${fileName}": ${err}`);
  }, [addToast]);

  // Key callbacks
  const onKeyGenSuccess = useCallback((keyName: string) => {
    addToast('success', `Generated key "${keyName}"`);
    refetchKeys();
  }, [addToast, refetchKeys]);

  const onKeyGenError = useCallback((err: string) => {
    addToast('error', `Key generation failed: ${err}`);
  }, [addToast]);

  const handleDeleteKey = useCallback(async () => {
    if (!keyToDelete) return;
    const result = await deleteKey(keyToDelete);
    if (result.success) {
      addToast('success', `Deleted key "${keyToDelete}"`);
      refetchKeys();
    } else {
      addToast('error', `Failed to delete key: ${result.error}`);
    }
    setKeyToDelete(null);
  }, [keyToDelete, addToast, refetchKeys]);

  // Settings
  const handleSaveSettings = useCallback(async (newSettings: typeof settings) => {
    await saveSettings(newSettings);
    refetch();
    refetchKeys();
    fetchDownloaded();
  }, [saveSettings, refetch, refetchKeys, fetchDownloaded]);

  // Backup/Restore callbacks
  const onBackupSuccess = useCallback((fileName: string) => {
    addToast('success', `Backup created: ${fileName}`);
  }, [addToast]);

  const onBackupError = useCallback((err: string) => {
    addToast('error', `Backup failed: ${err}`);
  }, [addToast]);

  const onRestoreSuccess = useCallback((restoredKeys: string[]) => {
    addToast('success', `Restored ${restoredKeys.length} key(s)`);
    refetchKeys();
  }, [addToast, refetchKeys]);

  const onRestoreError = useCallback((err: string) => {
    addToast('error', `Restore failed: ${err}`);
  }, [addToast]);

  // Rotation callbacks
  const onRotateSuccess = useCallback((fileName: string) => {
    addToast('success', `Key rotated for "${fileName}"`);
    refetch();
    refetchKeys();
  }, [addToast, refetch, refetchKeys]);

  const onRotateError = useCallback((fileName: string, err: string) => {
    addToast('error', `Key rotation failed for "${fileName}": ${err}`);
  }, [addToast]);

  const handleEmergencyRotation = useCallback(async (targetKey: string) => {
    setEmergencyRotationOpen(false);
    addToast('success', 'Emergency rotation started...');
    try {
      const res = await fetch('/api/files/rotate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({ fileName: f.fileName, keyName: f.keyName, folder: f.folder || '/' })),
          targetKey,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const failed = data.results?.filter((r: { success: boolean }) => !r.success).length || 0;
        if (failed > 0) {
          addToast('error', `Rotation done: ${data.rotated}/${data.total} succeeded, ${failed} failed`);
        } else {
          addToast('success', `All ${data.rotated} file(s) rotated successfully`);
        }
        refetch();
        refetchKeys();
      } else {
        addToast('error', data.error || 'Emergency rotation failed');
      }
    } catch {
      addToast('error', 'Network error during emergency rotation');
    }
  }, [files, addToast, refetch, refetchKeys]);

  // Folder delete with section reset
  const onDeleteFolder = useCallback(async (folder: string) => {
    const success = await handleDeleteFolder(folder);
    if (success && activeSection === `folder-${folder}`) {
      setActiveSection('my-drive');
    }
  }, [handleDeleteFolder, activeSection]);

  // Derive display files
  let displayFiles: FileItem[];

  if (activeSection === 'downloaded') {
    displayFiles = downloadedFiles.filter((file) =>
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else {
    let filteredFiles = files.filter((file) =>
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeSection.startsWith('category-')) {
      const category = activeSection.replace('category-', '') as FileCategory;
      filteredFiles = filteredFiles.filter((file) => getFileCategory(file.fileName) === category);
    }

    if (activeSection === 'starred') {
      filteredFiles = filteredFiles.filter((file) => file.isStarred);
    }

    if (activeSection === 'recent') {
      filteredFiles = filteredFiles
        .filter((file) => file.lastOpenedAt !== null)
        .sort((a, b) => new Date(b.lastOpenedAt!).getTime() - new Date(a.lastOpenedAt!).getTime());
    }

    if (activeSection === 'my-drive') {
      filteredFiles = filteredFiles.filter((file) => (file.folder || '/') === currentFolder);
    }

    displayFiles = filteredFiles;
  }

  const isMyDrive = activeSection === 'my-drive';
  const isDownloaded = activeSection === 'downloaded';

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsOpen={() => setSettingsOpen(true)}
        onEmergencyRotation={() => setEmergencyRotationOpen(true)}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        highSecurity={lockStatus.highSecurity}
        unlocked={lockStatus.unlocked}
        onLock={handleLock}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(s) => { setActiveSection(s); setCurrentFolder('/'); }}
          files={files}
          keys={keys}
          region={settings.region}
          onUploadClick={() => { setUploadOpen(true); setSidebarOpen(false); }}
          onGenerateKey={() => { setKeyGenOpen(true); setSidebarOpen(false); }}
          onDeleteKey={(k) => { setKeyToDelete(k); setSidebarOpen(false); }}
          onBackupClick={() => { setBackupOpen(true); setSidebarOpen(false); }}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 pt-5 pb-2 flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-800">
              {getSectionTitle(activeSection)}
            </h2>
            {isDownloaded && (
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                {settings.downloadPath || './download'}
              </span>
            )}
            {error && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {error}
              </span>
            )}
          </div>
          {isMyDrive && (
            <div className="px-6 pb-2">
              <FolderBreadcrumb
                currentFolder={currentFolder}
                onNavigate={setCurrentFolder}
                onCreateFolder={handleCreateFolder}
              />
            </div>
          )}
          {lockStatus.highSecurity && !lockStatus.unlocked && (
            <UnlockBanner
              onUnlockSuccess={handleUnlockSuccess}
              onError={(err) => addToast('error', err)}
            />
          )}
          <RotationBanner
            onRotateComplete={() => { refetch(); refetchKeys(); addToast('success', 'Key rotation completed'); }}
            onError={(err) => addToast('error', err)}
          />
          {activeSection === 'logs' ? (
            <LogViewer />
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <FileGrid
              files={displayFiles}
              subFolders={isMyDrive ? getSubFolders(currentFolder, folders).filter((f) => !searchQuery || f.split('/').pop()!.toLowerCase().includes(searchQuery.toLowerCase())) : undefined}
              folderSizes={isMyDrive ? computeFolderSizes(files, getSubFolders(currentFolder, folders)) : undefined}
              viewMode={viewMode}
              onDownloadSuccess={onDownloadSuccess}
              onDownloadError={onDownloadError}
              onFileOpen={isDownloaded && canOpenFiles ? onFileOpen : undefined}
              onStarToggle={onStarToggle}
              onDeleteSuccess={onDeleteSuccess}
              onDeleteError={onDeleteError}
              onDeleteLocalSuccess={isDownloaded ? onDeleteLocalSuccess : undefined}
              onDeleteLocalError={isDownloaded ? onDeleteLocalError : undefined}
              onRotateClick={!isDownloaded ? (fileName, keyName) => setRotateFile({ fileName, keyName }) : undefined}
              onPreviewClick={!isDownloaded ? (fileName, keyName) => setPreviewFile({ fileName, keyName }) : undefined}
              onMoveClick={!isDownloaded ? (fileName, folder) => setMoveFile({ fileName, folder }) : undefined}
              onProtectionChange={!isDownloaded ? () => refetch() : undefined}
              onFolderClick={isMyDrive ? setCurrentFolder : undefined}
              onDeleteFolder={isMyDrive ? onDeleteFolder : undefined}
              onMoveFolderClick={isMyDrive ? (folder) => setMoveFolderSource(folder) : undefined}
              onFileDrop={isMyDrive ? handleFileDrop : undefined}
              onFolderDrop={isMyDrive ? handleFolderDrop : undefined}
              hideDownload={isDownloaded}
              onContextCreateFolder={isMyDrive ? () => setCreateFolderOpen(true) : undefined}
              onContextUpload={!isDownloaded ? () => setUploadOpen(true) : undefined}
              onRenameFile={!isDownloaded ? async (oldName, newName) => {
                const result = await renameFile(oldName, newName);
                if (result.success) { addToast('success', `Renamed to "${newName}"`); refetch(); }
                else addToast('error', result.error || 'Rename failed');
              } : undefined}
              onRenameFolder={isMyDrive ? async (oldPath, newName) => {
                const result = await renameFolder(oldPath, newName);
                if (result.success) { addToast('success', `Folder renamed to "${newName}"`); refetchFolders(); refetch(); }
                else addToast('error', result.error || 'Rename failed');
              } : undefined}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        keys={keys}
        onSettingsChange={handleSaveSettings}
        onHighSecurityToggle={handleHighSecurityToggle}
      />
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        keys={keys}
        folders={folders}
        defaultFolder={currentFolder}
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
      />
      <KeyGenModal
        isOpen={keyGenOpen}
        onClose={() => setKeyGenOpen(false)}
        onSuccess={onKeyGenSuccess}
        onError={onKeyGenError}
      />
      <ConfirmModal
        isOpen={!!keyToDelete}
        title="Delete key"
        message={`Delete "${keyToDelete}" permanently? Files encrypted with this key will no longer be decryptable.`}
        confirmLabel="Delete"
        confirmText="delete"
        confirmCheckbox="I understand that files encrypted with this key will become permanently inaccessible."
        onConfirm={handleDeleteKey}
        onCancel={() => setKeyToDelete(null)}
      />
      <BackupKeysModal
        isOpen={backupOpen}
        onClose={() => setBackupOpen(false)}
        onBackupSuccess={onBackupSuccess}
        onBackupError={onBackupError}
        onRestoreSuccess={onRestoreSuccess}
        onRestoreError={onRestoreError}
      />
      <RotateKeyModal
        isOpen={!!rotateFile}
        fileName={rotateFile?.fileName || ''}
        currentKeyName={rotateFile?.keyName || ''}
        keys={keys}
        onClose={() => setRotateFile(null)}
        onSuccess={onRotateSuccess}
        onError={onRotateError}
      />
      <PreviewModal
        isOpen={!!previewFile}
        fileName={previewFile?.fileName || ''}
        keyName={previewFile?.keyName || ''}
        onClose={() => setPreviewFile(null)}
        onError={(fileName, err) => addToast('error', `Preview failed for "${fileName}": ${err}`)}
      />
      <MoveFileModal
        isOpen={!!moveFile}
        fileName={moveFile?.fileName || ''}
        currentFolder={moveFile?.folder || '/'}
        folders={folders}
        onClose={() => setMoveFile(null)}
        onSuccess={(fileName, folder) => { addToast('success', `Moved "${fileName}" to ${folder}`); refetch(); }}
        onError={(fileName, err) => addToast('error', `Failed to move "${fileName}": ${err}`)}
      />
      <MoveFolderModal
        isOpen={!!moveFolderSource}
        sourceFolder={moveFolderSource || ''}
        folders={folders}
        onClose={() => setMoveFolderSource(null)}
        onSuccess={(_, newPath) => { addToast('success', `Moved folder to ${newPath}`); refetchFolders(); refetch(); }}
        onError={(err) => addToast('error', err)}
      />
      <EmergencyRotationModal
        isOpen={emergencyRotationOpen}
        keys={keys}
        fileCount={files.length}
        onClose={() => setEmergencyRotationOpen(false)}
        onConfirm={handleEmergencyRotation}
      />
      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onConfirm={(name) => handleCreateFolder(currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
