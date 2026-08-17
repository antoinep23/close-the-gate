import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { ToastContainer } from './components/Toast';
import type { ToastData } from './components/Toast';
import { useFiles } from './hooks/useFiles';
import { useSettings } from './hooks/useSettings';
import { useKeys } from './hooks/useKeys';
import { getFileCategory } from './utils/fileIcons';
import type { FileCategory } from './utils/fileIcons';
import type { FileItem } from './data/mockFiles';
import { openFile } from './services/api';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection, setActiveSection] = useState('my-drive');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [downloadedFiles, setDownloadedFiles] = useState<FileItem[]>([]);
  const { files, loading, error, updateFileStar, refetch } = useFiles();
  const { settings, saveSettings } = useSettings();
  const { keys } = useKeys();

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
    addToast('success', `Deleted "${fileName}" from S3`);
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
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} files={files} keys={keys} region={settings.region} onUploadClick={() => setUploadOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-800">
              {getSectionTitle(activeSection)}
            </h2>
            {error && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {error}
              </span>
            )}
          </div>
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
              hideDownload={activeSection === 'downloaded'}
            />
          )}
        </main>
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={saveSettings}
      />
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        keys={keys}
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
