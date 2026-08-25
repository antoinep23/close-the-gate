import { useState, useEffect, useCallback } from 'react';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineReload, AiOutlineSafety } from 'react-icons/ai';

interface AuditEntry {
  eventId: string;
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
  hash: string;
}

interface VerifyResult {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  reason?: string;
}

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
  return `${formatted} (UTC)`;
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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-log?limit=200');
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          No audit logs yet
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-gray-500 border-b border-gray-200">
              <th className="pb-2 pl-2 font-medium">Event ID</th>
              <th className="pb-2 font-medium">Event</th>
              <th className="pb-2 font-medium">Resource</th>
              <th className="pb-2 pr-2 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={`${entry.hash}-${i}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-2 pl-2 pr-4 text-gray-400 font-mono text-[11px]">{entry.eventId || entry.hash.slice(0, 8)}</td>
                <td className="py-2 pr-4 text-gray-700">{entry.action}</td>
                <td className="py-2 pr-4 text-gray-700 truncate max-w-[300px]">{getResource(entry)}</td>
                <td className="py-2 pr-2 text-gray-700 text-right whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
