import { AiOutlineStar, AiOutlineFileImage, AiOutlineFileText, AiOutlinePlayCircle, AiOutlineCode, AiOutlineFileZip, AiOutlineKey, AiOutlineDownload, AiOutlinePlus, AiOutlineDelete, AiOutlineSave, AiOutlineClockCircle, AiOutlineAudit } from 'react-icons/ai';
import { HiOutlineFolderOpen } from 'react-icons/hi';
import type { FileItem } from '../data/mockFiles';
import type { FileCategory } from '../utils/fileIcons';
import { formatSize } from '../utils/format';
import { getS3PricePerGb } from '../data/s3Pricing';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  files: FileItem[];
  keys: string[];
  region: string;
  onUploadClick: () => void;
  onGenerateKey: () => void;
  onDeleteKey: (keyName: string) => void;
  onBackupClick: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { id: 'my-drive', label: 'All Files', icon: HiOutlineFolderOpen },
  { id: 'recent', label: 'Recent', icon: AiOutlineClockCircle },
  { id: 'starred', label: 'Starred', icon: AiOutlineStar },
  { id: 'downloaded', label: 'Downloaded', icon: AiOutlineDownload },
  { id: 'logs', label: 'Audit Logs', icon: AiOutlineAudit },
];

const categoryItems: { id: FileCategory; label: string; icon: typeof AiOutlineFileImage }[] = [
  { id: 'images', label: 'Images', icon: AiOutlineFileImage },
  { id: 'documents', label: 'Documents', icon: AiOutlineFileText },
  { id: 'videos', label: 'Videos', icon: AiOutlinePlayCircle },
  { id: 'code', label: 'Code', icon: AiOutlineCode },
  { id: 'archives', label: 'Archives', icon: AiOutlineFileZip },
];

function estimateMonthlyCost(totalBytes: number, region: string): string {
  const gb = totalBytes / (1024 * 1024 * 1024);
  const pricePerGb = getS3PricePerGb(region);
  const cost = gb * pricePerGb;
  if (cost < 0.01) return '< $0.01';
  return `~$${cost.toFixed(2)}`;
}

export function Sidebar({ activeSection, onSectionChange, files, keys, region, onUploadClick, onGenerateKey, onDeleteKey, onBackupClick, mobileOpen, onMobileClose }: SidebarProps) {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalStorageSize = formatSize(totalBytes);
  const monthlyCost = estimateMonthlyCost(totalBytes, region);

  function handleSectionChange(section: string) {
    onSectionChange(section);
    onMobileClose?.();
  }

  return (
    <>
      {/* Short screen overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onMobileClose}></div>
      )}
      <aside className={`bg-[#f8f9fa] border-r border-gray-200 h-full flex flex-col fixed md:static z-50 md:z-auto w-64 md:w-56 transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-4">
          <button onClick={onUploadClick} className="flex items-center cursor-pointer gap-2 bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm hover:shadow-md transition-shadow w-full">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-medium text-gray-700 text-sm">New</span>
          </button>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-2 rounded-full text-sm mb-0.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#c2e7ff] text-[#001d35] font-medium'
                    : 'text-gray-700 hover:bg-gray-200/60'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mt-5 mb-2 px-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Categories</span>
          </div>

          {categoryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === `category-${item.id}`;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(`category-${item.id}`)}
                className={`flex items-center gap-3 w-full px-4 py-2 rounded-full text-sm mb-0.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#c2e7ff] text-[#001d35] font-medium'
                    : 'text-gray-700 hover:bg-gray-200/60'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mt-5 mb-2 px-4 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Keys</span>
            <div className="flex items-center gap-1">
              <button
                onClick={onBackupClick}
                className="p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                title="Backup / Restore keys"
              >
                <AiOutlineSave className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button
                onClick={onGenerateKey}
                className="p-0.5 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                title="Generate new key"
              >
                <AiOutlinePlus className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {keys.length === 0 ? (
            <p className="px-4 text-xs text-gray-400 italic">No keys found</p>
          ) : (
            keys.map((keyName) => (
              <div
                key={keyName}
                className="group flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 truncate"
                title={keyName}
              >
                <AiOutlineKey className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span className="truncate flex-1 text-[13px]">{keyName}</span>
                <button
                  onClick={() => onDeleteKey(keyName)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 cursor-pointer transition-all"
                  title="Delete key"
                >
                  <AiOutlineDelete className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            ))
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">{totalStorageSize} used</div>
          <div className="text-xs text-gray-400 text-center mt-0.5">Est. {monthlyCost}/mo (storage only)</div>
        </div>
      </aside>
    </>
  );
}
