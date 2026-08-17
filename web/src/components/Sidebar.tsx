import { AiOutlineStar, AiOutlineFileImage, AiOutlineFileText, AiOutlinePlayCircle, AiOutlineCode, AiOutlineFileZip, AiOutlineKey, AiOutlineDownload } from 'react-icons/ai';
import { HiOutlineFolderOpen } from 'react-icons/hi';
import type { FileItem } from '../data/mockFiles';
import type { FileCategory } from '../utils/fileIcons';
import { getS3PricePerGb } from '../data/s3Pricing';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  files: FileItem[];
  keys: string[];
  region: string;
  onUploadClick: () => void;
}

const navItems = [
  { id: 'my-drive', label: 'All Files', icon: HiOutlineFolderOpen },
  { id: 'starred', label: 'Starred', icon: AiOutlineStar },
  { id: 'downloaded', label: 'Downloaded', icon: AiOutlineDownload },
];

const categoryItems: { id: FileCategory; label: string; icon: typeof AiOutlineFileImage }[] = [
  { id: 'images', label: 'Images', icon: AiOutlineFileImage },
  { id: 'documents', label: 'Documents', icon: AiOutlineFileText },
  { id: 'videos', label: 'Videos', icon: AiOutlinePlayCircle },
  { id: 'code', label: 'Code', icon: AiOutlineCode },
  { id: 'archives', label: 'Archives', icon: AiOutlineFileZip },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// S3 Standard pricing based on configured region
function estimateMonthlyCost(totalBytes: number, region: string): string {
  const gb = totalBytes / (1024 * 1024 * 1024);
  const pricePerGb = getS3PricePerGb(region);
  const cost = gb * pricePerGb;
  if (cost < 0.01) return '< $0.01';
  return `~$${cost.toFixed(2)}`;
}

export function Sidebar({ activeSection, onSectionChange, files, keys, region, onUploadClick }: SidebarProps) {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalStorageSize = formatSize(totalBytes);
  const monthlyCost = estimateMonthlyCost(totalBytes, region);
  return (
    <aside className="w-56 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4">
        <button onClick={onUploadClick} className="flex items-center cursor-pointer gap-2 bg-white border border-gray-300 rounded-2xl px-5 py-3 shadow-sm hover:shadow-md transition-shadow w-full">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium text-gray-700 text-sm">Upload</span>
        </button>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex items-center gap-3 w-full px-4 py-2 rounded-full text-sm mb-1 cursor-pointer transition-colors ${
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

        <div className="mt-4 mb-2 px-4">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Categories</span>
        </div>

        {categoryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === `category-${item.id}`;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(`category-${item.id}`)}
              className={`flex items-center gap-3 w-full px-4 py-2 rounded-full text-sm mb-1 cursor-pointer transition-colors ${
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

        <div className="mt-4 mb-2 px-4">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Keys</span>
        </div>

        {keys.length === 0 ? (
          <p className="px-4 text-xs text-gray-400 italic">No keys found</p>
        ) : (
          keys.map((keyName) => (
            <div
              key={keyName}
              className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 truncate"
              title={keyName}
            >
              <AiOutlineKey className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span className="truncate">{keyName}</span>
            </div>
          ))
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">Total Storage: {totalStorageSize}</div>
        <div className="text-xs text-gray-400 text-center mt-1">Est. cost: {monthlyCost}/mo</div>
      </div>
    </aside>
  );
}
