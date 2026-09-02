import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineReload, AiOutlineSafety, AiOutlineFilter, AiOutlineDown, AiOutlineSearch } from 'react-icons/ai';
import type { AuditAction } from '../../server/auditLog';

interface AuditEntry {
  eventId: string;
  timestamp: string;
  action: AuditAction;
  details: Record<string, unknown>;
  hash: string;
}

interface VerifyResult {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  reason?: string;
}

// Number of log entries displayed per page
const PAGE_SIZE = 50;

const ALL_ACTIONS: Record<AuditAction, string> = {
  'upload': 'Upload',
  'download': 'Download',
  'delete': 'Delete',
  'preview': 'Preview',
  'share': 'Share',
  'rename': 'Rename',
  'move': 'Move',
  'rotate': 'Rotate',
  'rotate-batch': 'Rotate Batch',
  'star': 'Star',
  'unstar': 'Unstar',
  'protect': 'Protect',
  'unprotect': 'Unprotect',
  'key-generate': 'Generate Key',
  'key-delete': 'Delete Key',
  'key-backup': 'Backup Key',
  'key-restore': 'Restore Key',
  'folder-create': 'Create Folder',
  'folder-delete': 'Delete Folder',
  'folder-rename': 'Rename Folder',
  'folder-move': 'Move Folder',
  'lock': 'Lock',
  'unlock': 'Unlock',
  'high-security-enable': 'Enable High Security',
  'high-security-disable': 'Disable High Security',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const formatted = d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return formatted;
}

function getResource(entry: AuditEntry): string {
  const d = entry.details;
  const folder = d.folder ? d.folder as string : null;
  const prefix = folder && folder !== '/' ? `${folder}/` : '';

  if (d.oldName) return `${prefix}${d.oldName} → ${d.newName}`;
  if (d.fileName) return `${prefix}${d.fileName}`;
  if (d.keyName) return d.keyName as string;
  if (d.oldPath) return `${d.oldPath} → ${d.newPath}`;
  if (d.sourceFolder) return `${d.sourceFolder} → ${d.targetFolder}`;
  if (d.rotated !== undefined) return `${d.rotated}/${d.total} files → ${d.targetKey}`;
  if (d.backupFileName) return d.backupFileName as string;
  if (d.keyCount !== undefined) return `${d.keyCount} key(s)`;
  return '—';
}

export function LogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Filters
  const [selectedActions, setSelectedActions] = useState<Set<AuditAction>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-log?limit=1000');
      if (res.ok) setEntries(await res.json());
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/audit-log/verify');
      if (res.ok) setVerifyResult(await res.json());
    } catch {
      setVerifyResult({ valid: false, totalEntries: 0, reason: 'Network error' });
    }
    setVerifying(false);
  }

    function toggleAction(action: AuditAction) {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  }

  function clearFilters() {
    setSelectedActions(new Set());
    setDateFrom('');
    setDateTo('');
  }

  const activeFilterCount =
    selectedActions.size + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

    const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter(entry => {
      if (selectedActions.size > 0 && !selectedActions.has(entry.action as AuditAction)) {
        return false;
      }
      if (dateFrom || dateTo) {
        const entryTime = new Date(entry.timestamp).getTime();
        if (dateFrom) {
          const fromTime = new Date(`${dateFrom}T00:00:00Z`).getTime();
          if (entryTime < fromTime) return false;
        }
        if (dateTo) {
          const toTime = new Date(`${dateTo}T23:59:59.999Z`).getTime();
          if (entryTime > toTime) return false;
        }
      }
      if (query && !entry.eventId?.toLowerCase().includes(query) && !entry.hash.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [entries, selectedActions, dateFrom, dateTo, searchQuery]);

  // Reset to first page whenever the filtered result set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedActions, dateFrom, dateTo, searchQuery, entries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pageEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);



  return (
    <div className="px-6 pt-2 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
        >
          <AiOutlineReload className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50"
        >
          <AiOutlineSafety className="w-3.5 h-3.5" />
          {verifying ? 'Verifying...' : 'Verify integrity'}
        </button>

        {verifyResult && (
          <span className={`flex items-center gap-1 text-xs font-medium ${verifyResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            {verifyResult.valid ? (
              <><AiOutlineCheckCircle className="w-4 h-4" /> Chain valid ({verifyResult.totalEntries} entries)</>
            ) : (
              <><AiOutlineCloseCircle className="w-4 h-4" /> Tampered at #{verifyResult.brokenAt}</>
            )}
          </span>
        )}

        {/* Spacer pushes the filter selector to the right */}
        <div className="flex-1" />


        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by event ID..."
            className="w-48 text-xs border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <AiOutlineSearch className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <AiOutlineFilter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-blue-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <AiOutlineDown className="w-3 h-3" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Filters</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="mb-3">
                <div className="text-[11px] font-medium text-gray-500 mb-1">Date range</div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700"
                  />
                  <span className="text-gray-400 text-xs">→</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-gray-500 mb-1">Event type</div>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5">
                  {Object.entries(ALL_ACTIONS).map(([key, label]) => {
                    const action = key as AuditAction;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-xs text-gray-700 py-0.5 px-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedActions.has(action)}
                          onChange={() => toggleAction(action)}
                          className="w-3.5 h-3.5"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          {entries.length === 0 ? 'No audit logs yet' : 'No entries match the current filters'}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-gray-500 border-b border-gray-200">
              <th className="pb-2 pl-2 font-medium">Event ID</th>
              <th className="pb-2 font-medium">Event</th>
              <th className="pb-2 font-medium">Resource</th>
              <th className="pb-2 pr-2 font-medium text-right">Time (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry, i) => (
              <tr key={`${entry.hash}-${i}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-2 pl-2 pr-4 text-gray-400 font-mono text-[11px]">{entry.eventId || entry.hash.slice(0, 8)}</td>
                <td className="py-2 pr-4 text-gray-700">{ALL_ACTIONS[entry.action] || entry.action}</td>
                <td className="py-2 pr-4 text-gray-700 truncate max-w-[300px]">{getResource(entry)}</td>
                <td className="py-2 pr-2 text-gray-700 text-right whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {!loading && filteredEntries.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
