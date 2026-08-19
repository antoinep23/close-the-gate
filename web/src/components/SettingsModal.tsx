import { useState } from 'react';
import { AiOutlineClose, AiOutlineLock } from 'react-icons/ai';

export interface AutoRotationSettings {
  enabled: boolean;
  intervalDays: number;
  targetKey: string;
}

export interface PathSettings {
  keysPath: string;
  filesPath: string;
  downloadPath: string;
  region: string;
  highSecurity: boolean;
  autoRotation: AutoRotationSettings;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PathSettings;
  keys: string[];
  onSettingsChange: (settings: PathSettings) => void;
  onHighSecurityToggle: (enabled: boolean, password?: string) => void;
}

export function SettingsModal({ isOpen, onClose, settings, keys, onSettingsChange, onHighSecurityToggle }: SettingsModalProps) {
  const [hsPassword, setHsPassword] = useState('');
  const [hsConfirm, setHsConfirm] = useState('');
  const [hsShowInput, setHsShowInput] = useState(false);

  if (!isOpen) return null;

  const fields = [
    { key: 'keysPath' as const, label: 'Keys Path', placeholder: './keys' },
    { key: 'filesPath' as const, label: 'Files Path', placeholder: './files' },
    { key: 'downloadPath' as const, label: 'Download Path', placeholder: './download' },
  ];

  const autoRotation = settings.autoRotation || { enabled: false, intervalDays: 90, targetKey: '' };

  function updateAutoRotation(patch: Partial<AutoRotationSettings>) {
    onSettingsChange({
      ...settings,
      autoRotation: { ...autoRotation, ...patch },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close settings"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={settings[field.key]}
                onChange={(e) =>
                  onSettingsChange({ ...settings, [field.key]: e.target.value })
                }
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 mb-6">
          Paths are relative to the project root or absolute.
        </p>

        {/* High Security Mode */}
        <div className="border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                <AiOutlineLock className="w-4 h-4 text-amber-500" />
                High Security Mode
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Keys are encrypted at rest and only loaded in memory after password unlock</p>
            </div>
            {!settings.highSecurity && !hsShowInput && (
              <button
                onClick={() => setHsShowInput(true)}
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer bg-gray-300"
                role="switch"
                aria-checked={false}
                aria-label="Enable high security mode"
              >
                <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow translate-x-0" />
              </button>
            )}
            {settings.highSecurity && (
              <button
                onClick={() => { onHighSecurityToggle(false); }}
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer bg-amber-500"
                role="switch"
                aria-checked={true}
                aria-label="Disable high security mode"
              >
                <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow translate-x-[18px]" />
              </button>
            )}
          </div>

          {hsShowInput && !settings.highSecurity && (
            <div className="mt-3 space-y-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs text-amber-700">Choose a password to encrypt your keys. You will need it every time you start the app.</p>
              <input
                type="password"
                value={hsPassword}
                onChange={(e) => setHsPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
              />
              <input
                type="password"
                value={hsConfirm}
                onChange={(e) => setHsConfirm(e.target.value)}
                placeholder="Confirm password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setHsShowInput(false); setHsPassword(''); setHsConfirm(''); }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (hsPassword && hsPassword === hsConfirm) {
                      onHighSecurityToggle(true, hsPassword);
                      setHsShowInput(false);
                      setHsPassword('');
                      setHsConfirm('');
                    }
                  }}
                  disabled={!hsPassword || hsPassword !== hsConfirm}
                  className="px-3 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Activate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto Key Rotation */}
        <div className="border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Auto Key Rotation</h3>
              <p className="text-xs text-gray-400 mt-0.5">Automatically rotate encryption keys after a set period</p>
            </div>
            <button
              onClick={() => updateAutoRotation({ enabled: !autoRotation.enabled })}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                autoRotation.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={autoRotation.enabled}
              aria-label="Toggle auto key rotation"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  autoRotation.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {autoRotation.enabled && (
            <div className="space-y-4 pl-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotation interval (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={autoRotation.intervalDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) updateAutoRotation({ intervalDays: val });
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 transition-all ${
                    autoRotation.intervalDays >= 1 && autoRotation.intervalDays <= 365
                      ? 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                      : 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  }`}
                />
                <p className={`text-xs mt-1 ${
                  autoRotation.intervalDays >= 1 && autoRotation.intervalDays <= 365
                    ? 'text-gray-400'
                    : 'text-red-500'
                }`}>
                  {autoRotation.intervalDays >= 1 && autoRotation.intervalDays <= 365
                    ? 'Files older than this will be flagged for rotation'
                    : 'Must be between 1 and 365 days'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target key
                </label>
                {keys.length === 0 ? (
                  <p className="text-sm text-red-500">No keys available. Generate one first.</p>
                ) : (
                  <select
                    value={autoRotation.targetKey}
                    onChange={(e) => updateAutoRotation({ targetKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  >
                    <option value="__auto_generate__">Auto-generate new key</option>
                    {keys.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {autoRotation.targetKey === '__auto_generate__'
                    ? 'A new key will be generated at each rotation'
                    : 'All eligible files will be rotated to this key'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
