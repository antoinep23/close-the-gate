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
    <header className="h-16 border-b border-gray-200 flex items-center px-4 gap-3 bg-white">
      {/* Short screen menu */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <AiOutlineMenu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="CTG" className="w-8 h-8" />
        <h1 className="text-[22px] font-medium text-gray-900">Drive</h1>
      </div>

      {/* Short screen logo */}
      <img src="/logo.png" alt="CTG" className="w-7 h-7 md:hidden shrink-0" />

      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <AiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search in Drive"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#edf2fc] rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-800 outline-none focus:bg-white focus:shadow-md focus:ring-1 focus:ring-gray-200 transition-all placeholder-gray-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onViewModeChange('list')}
          className={`hidden sm:flex p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'list' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="List view"
        >
          <HiOutlineViewList className="w-5 h-5" />
        </button>

        <button
          onClick={() => onViewModeChange('grid')}
          className={`hidden sm:flex p-2 rounded-full transition-colors cursor-pointer ${
            viewMode === 'grid' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-gray-600 hover:bg-gray-100'
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
          className="hidden sm:flex p-2 rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Emergency key rotation"
          title="Rotate all keys (emergency)"
        >
          <AiOutlineSync className="w-5 h-5" />
        </button>

        <button
          onClick={onSettingsOpen}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label="Settings"
        >
          <AiOutlineSetting className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
