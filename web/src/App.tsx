import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { SettingsModal } from './components/SettingsModal';
import { useFiles } from './hooks/useFiles';
import { useSettings } from './hooks/useSettings';
import { getFileCategory } from './utils/fileIcons';
import type { FileCategory } from './utils/fileIcons';

function getSectionTitle(section: string): string {
  if (section === 'my-drive') return 'All Files';
  if (section === 'starred') return 'Starred';
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
  const { files, loading, error } = useFiles();
  const { settings, saveSettings } = useSettings();

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
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} files={files} />
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
            <FileGrid files={filteredFiles} viewMode={viewMode} />
          )}
        </main>
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={saveSettings}
      />
    </div>
  );
}

export default App;
