import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { useFiles } from './hooks/useFiles';

function App() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection, setActiveSection] = useState('my-drive');
  const [searchQuery, setSearchQuery] = useState('');
  const { files, loading, error } = useFiles();

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} files={files} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-800">
              {activeSection === 'my-drive' && 'All Files'}
              {activeSection === 'starred' && 'Starred'}
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
    </div>
  );
}

export default App;
