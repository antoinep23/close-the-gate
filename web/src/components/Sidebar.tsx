import { AiOutlineCloud, AiOutlineClockCircle, AiOutlineStar, AiOutlineDelete } from 'react-icons/ai';
import { HiOutlineFolderOpen } from 'react-icons/hi';
import { getTotalStorageSize } from '../utils/storage';
import type { FileItem } from '../data/mockFiles';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  files: FileItem[];
}

const navItems = [
  { id: 'my-drive', label: 'My Drive', icon: HiOutlineFolderOpen },
  { id: 'shared', label: 'Shared', icon: AiOutlineCloud },
  { id: 'recent', label: 'Recent', icon: AiOutlineClockCircle },
  { id: 'starred', label: 'Starred', icon: AiOutlineStar },
  { id: 'trash', label: 'Trash', icon: AiOutlineDelete },
];

export function Sidebar({ activeSection, onSectionChange, files }: SidebarProps) {
  const totalStorageSize = getTotalStorageSize(files);
  
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4">
        <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-2xl px-5 py-3 shadow-sm hover:shadow-md transition-shadow w-full">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium text-gray-700 text-sm">New</span>
        </button>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex items-center gap-3 w-full px-4 py-2 rounded-full text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">Total Storage: {totalStorageSize}</div>
      </div>
    </aside>
  );
}
