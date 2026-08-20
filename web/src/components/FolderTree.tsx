import { AiOutlineFolder } from 'react-icons/ai';

interface FolderTreeProps {
  folders: string[];
  selectedFolder: string;
  onSelect: (folder: string) => void;
}

/**
 * Builds a sorted, indented folder tree from a flat list of absolute paths.
 * Sorts alphabetically, groups children under parents, and displays only the leaf name.
 */
export function FolderTree({ folders, selectedFolder, onSelect }: FolderTreeProps) {
  // Sort folders so parents come before children and siblings are alphabetical
  const sorted = [...folders].sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-0.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
      {sorted.map((f) => {
        // Calculate depth for indentation (root = 0, /foo = 1, /foo/bar = 2)
        const depth = f === '/' ? 0 : f.split('/').filter(Boolean).length;
        // Display name: root shows "Root", others show leaf folder name
        const displayName = f === '/' ? 'root' : f.split('/').filter(Boolean).pop() || f;

        return (
          <button
            key={f}
            onClick={() => onSelect(f)}
            className={`flex items-center gap-2 w-full py-2 pr-3 rounded-md text-sm cursor-pointer transition-colors ${
              selectedFolder === f
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <AiOutlineFolder className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="truncate">{displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
