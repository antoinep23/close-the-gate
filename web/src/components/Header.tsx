import { AiOutlineSearch, AiOutlineSetting, AiOutlineSync, AiOutlineLock, AiOutlineUnlock, AiOutlineMenu } from 'react-icons/ai';
import { HiOutlineViewGrid, HiOutlineViewList } from 'react-icons/hi';

interface HeaderProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSettingsOpen: () => void;
  onEmergencyRotation: () => void;
  onMenuToggle: () => void;
  highSecurity?: boolean;
  unlocked?: boolean;
  onLock?: () => void;
}

export function Header({ viewMode, onViewModeChange, searchQuery, onSearchChange, onSettingsOpen, onEmergencyRotation, onMenuToggle, highSecurity, unlocked, onLock }: HeaderProps) {
  return (
    <header className="h-14 md:h-16 border-b border-gray-200 flex items-center px-3 md:px-4 gap-2 md:gap-4 bg-white">
      {/* Short screen menu button */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <AiOutlineMenu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex items-center gap-2">
        <img src="/logo.png" alt="CTG" className="w-7 h-7" />
        <h1 className="text-lg font-medium text-gray-800">Close the Gate Drive</h1>
      </div>

      {/* Short screen logo only */}
      <img src="/logo.png" alt="CTG" className="w-6 h-6 md:hidden" />

      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-100 rounded-full py-2 md:py-2.5 pl-9 md:pl-10 pr-3 md:pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1">
        <button
          onClick={() => onViewModeChange('list')}
          className={`hidden sm:block p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          aria-label="List view"
        >
          <HiOutlineViewList className="w-5 h-5" />
        </button>

        <button
          onClick={() => onViewModeChange('grid')}
          className={`hidden sm:block p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          aria-label="Grid view"
        >
          <HiOutlineViewGrid className="w-5 h-5" />
        </button>

        <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1"></div>

        {highSecurity && (
          <button
            onClick={onLock}
            disabled={!unlocked}
            className={`p-2 rounded-full cursor-pointer transition-colors ${
              unlocked
                ? 'text-green-600 hover:bg-green-50'
                : 'text-amber-500 opacity-60 cursor-not-allowed'
            }`}
            aria-label={unlocked ? 'Lock keys' : 'Keys locked'}
            title={unlocked ? 'Lock keys (clear from memory)' : 'Keys are locked'}
          >
            {unlocked ? <AiOutlineUnlock className="w-5 h-5" /> : <AiOutlineLock className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={onEmergencyRotation}
          className="hidden sm:block p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
          aria-label="Emergency key rotation"
          title="Rotate all keys (emergency)"
        >
          <AiOutlineSync className="w-5 h-5" />
        </button>

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
