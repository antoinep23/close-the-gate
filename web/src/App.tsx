import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { RotationBanner } from './components/RotationBanner';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { KeyGenModal } from './components/KeyGenModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/Toast';
import type { ToastData } from './components/Toast';
import { useFiles } from './hooks/useFiles';
import { useSettings } from './hooks/useSettings';
import { useKeys } from './hooks/useKeys';
import { getFileCategory } from './utils/fileIcons';
import type { FileCategory } from './utils/fileIcons';
import type { FileItem } from './data/mockFiles';
import { openFile, deleteKey, openDownloadFolder } from './services/api';
import { BackupKeysModal } from './components/BackupKeysModal';
import { RotateKeyModal } from './components/RotateKeyModal';

function getSectionTitle(section: string): string {
  if (section === 'my-drive') return 'All Files';
  if (section === 'starred') return 'Starred';
  if (section === 'downloaded') return 'Downloaded';
  if (section.startsWith('category-')) {
    const cat = section.replace('category-', '');
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return '';
}

function App() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeSection, setActiveSection] = useState('my-drive');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [keyGenOpen, setKeyGenOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [rotateFile, setRotateFile] = useState<{ fileName: string; keyName: string } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [downloadedFiles, setDownloadedFiles] = useState<FileItem[]>([]);
  const { files, loading, error, updateFileStar, refetch } = useFiles();
  const { settings, saveSettings } = useSettings();
  const { keys, refetchKeys } = useKeys();

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch downloaded files when section is active or after a download
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
          keyName: '',
        }))
      );
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'downloaded') {
      fetchDownloaded();
    }
  }, [activeSection, fetchDownloaded]);

  const onDownloadSuccess = useCallback((fileName: string) => {
    addToast('success', `Downloaded "${fileName}" successfully`);
    fetchDownloaded();
  }, [addToast, fetchDownloaded]);

  const onDownloadError = useCallback((fileName: string, err: string) => {
    addToast('error', `Failed to download "${fileName}": ${err}`);
  }, [addToast]);

  const onFileOpen = useCallback(async (fileName: string) => {
    const result = await openFile(fileName);
    if (!result.success) {
      addToast('error', `Failed to open "${fileName}": ${result.error}`);
    }
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

  const onKeyGenSuccess = useCallback((keyName: string) => {
    addToast('success', `Generated key "${keyName}"`);
    refetchKeys();
  }, [addToast, refetchKeys]);

  const handleSaveSettings = useCallback(async (newSettings: typeof settings) => {
    await saveSettings(newSettings);
    refetch();
    refetchKeys();
    fetchDownloaded();
  }, [saveSettings, refetch, refetchKeys, fetchDownloaded]);

  const onKeyGenError = useCallback((err: string) => {
    addToast('error', `Key generation failed: ${err}`);
  }, [addToast]);

  const onBackupSuccess = useCallback((fileName: string) => {
    addToast('success', `Backup created: ${fileName}`);
  }, [addToast]);

  const onBackupError = useCallback((err: string) => {
    addToast('error', `Backup failed: ${err}`);
  }, [addToast]);

  const onRestoreSuccess = useCallback((keys: string[]) => {
    addToast('success', `Restored ${keys.length} key(s)`);
    refetchKeys();
  }, [addToast, refetchKeys]);

  const onRestoreError = useCallback((err: string) => {
    addToast('error', `Restore failed: ${err}`);
  }, [addToast]);

  const onRotateSuccess = useCallback((fileName: string) => {
    addToast('success', `Key rotated for "${fileName}"`);
    refetch();
    refetchKeys();
  }, [addToast, refetch, refetchKeys]);

  const onRotateError = useCallback((fileName: string, err: string) => {
    addToast('error', `Key rotation failed for "${fileName}": ${err}`);
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

    displayFiles = filteredFiles;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} files={files} keys={keys} region={settings.region} onUploadClick={() => setUploadOpen(true)} onGenerateKey={() => setKeyGenOpen(true)} onDeleteKey={(k) => setKeyToDelete(k)} onBackupClick={() => setBackupOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-800">
              {getSectionTitle(activeSection)}
            </h2>
            {activeSection === 'downloaded' && (
              <button
                onClick={() => openDownloadFolder()}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Open folder"
                aria-label="Open download folder"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}
            {error && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {error}
              </span>
            )}
          </div>
          <RotationBanner
            onRotateComplete={() => { refetch(); refetchKeys(); addToast('success', 'Key rotation completed'); }}
            onError={(err) => addToast('error', err)}
          />
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <FileGrid
              files={displayFiles}
              viewMode={viewMode}
              onDownloadSuccess={onDownloadSuccess}
              onDownloadError={onDownloadError}
              onFileOpen={activeSection === 'downloaded' ? onFileOpen : undefined}
              onStarToggle={onStarToggle}
              onDeleteSuccess={onDeleteSuccess}
              onDeleteError={onDeleteError}
              onDeleteLocalSuccess={activeSection === 'downloaded' ? onDeleteLocalSuccess : undefined}
              onDeleteLocalError={activeSection === 'downloaded' ? onDeleteLocalError : undefined}
              onRotateClick={activeSection !== 'downloaded' ? (fileName, keyName) => setRotateFile({ fileName, keyName }) : undefined}
              onProtectionChange={activeSection !== 'downloaded' ? () => refetch() : undefined}
              hideDownload={activeSection === 'downloaded'}
            />
          )}
        </main>
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        keys={keys}
        onSettingsChange={handleSaveSettings}
      />
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        keys={keys}
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
