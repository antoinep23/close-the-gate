import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { mockFiles } from './data/mockFiles';

function App() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection, setActiveSection] = useState('my-drive');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = mockFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-800">
              {activeSection === 'my-drive' && 'My Drive'}
              {activeSection === 'shared' && 'Shared with me'}
              {activeSection === 'recent' && 'Recent'}
              {activeSection === 'starred' && 'Starred'}
              {activeSection === 'trash' && 'Trash'}
            </h2>
          </div>
          <FileGrid files={filteredFiles} viewMode={viewMode} />
        </main>
      </div>
    </div>
  );
}

export default App;
