import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineLock, AiOutlineSave, AiOutlineUndo } from 'react-icons/ai';
import { backupKeys, restoreKeys, listBackups } from '../services/api';

interface BackupKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupSuccess: (fileName: string) => void;
  onBackupError: (error: string) => void;
  onRestoreSuccess: (keys: string[]) => void;
  onRestoreError: (error: string) => void;
}

interface BackupFile {
  fileName: string;
  createdAt: number;
  size: number;
}

export function BackupKeysModal({ isOpen, onClose, onBackupSuccess, onBackupError, onRestoreSuccess, onRestoreError }: BackupKeysModalProps) {
  const [tab, setTab] = useState<'backup' | 'restore'>('backup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState('');

  useEffect(() => {
    if (isOpen && tab === 'restore') {
      listBackups().then((files) => {
        setBackups(files);
        if (files.length > 0) setSelectedBackup(files[0].fileName);
      });
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  function reset() {
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  }

  async function handleBackup() {
    if (!password) return;
    if (password !== confirmPassword) {
      onBackupError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await backupKeys(password);
    setLoading(false);

    if (result.success) {
      onBackupSuccess(result.fileName || 'backup');
      reset();
      onClose();
    } else {
      onBackupError(result.error || 'Backup failed');
    }
  }

  async function handleRestore() {
    if (!password || !selectedBackup) return;

    setLoading(true);
    const result = await restoreKeys(password, selectedBackup);
    setLoading(false);

    if (result.success) {
      onRestoreSuccess(result.restoredKeys || []);
      reset();
      onClose();
    } else {
      onRestoreError(result.error || 'Restore failed');
    }
  }

  function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800">Key Backup</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => setTab('backup')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === 'backup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AiOutlineSave className="w-4 h-4" />
            Backup
          </button>
          <button
            onClick={() => setTab('restore')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === 'restore'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AiOutlineUndo className="w-4 h-4" />
            Restore
          </button>
        </div>

        {tab === 'backup' ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Creates an encrypted backup of all your keys. The file can only be opened with the password you set.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleBackup}
              disabled={!password || !confirmPassword || loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading ? 'Creating backup...' : 'Create Backup'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Restore keys from a previously created backup file. You need the password used during backup.
            </p>
            {backups.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No backup files found</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backup file</label>
                <select
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
                >
                  {backups.map((b) => (
                    <option key={b.fileName} value={b.fileName}>
                      {b.fileName} ({formatDate(b.createdAt)})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter backup password"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleRestore}
              disabled={!password || !selectedBackup || loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading ? 'Restoring...' : 'Restore Keys'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
