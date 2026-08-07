import { AiOutlineSearch, AiOutlineSetting } from 'react-icons/ai';
import { HiOutlineViewGrid, HiOutlineViewList } from 'react-icons/hi';

interface HeaderProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSettingsOpen: () => void;
}

export function Header({ viewMode, onViewModeChange, searchQuery, onSearchChange, onSettingsOpen }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 flex items-center px-4 gap-4 bg-white">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-medium text-gray-800">Close the Gate Drive</h1>
      </div>

      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          aria-label="Grid view"
        >
          <HiOutlineViewGrid className="w-5 h-5" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          aria-label="List view"
        >
          <HiOutlineViewList className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        <button
          onClick={onSettingsOpen}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Settings"
        >
          <AiOutlineSetting className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
