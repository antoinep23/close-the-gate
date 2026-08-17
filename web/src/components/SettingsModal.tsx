import { AiOutlineClose } from 'react-icons/ai';

export interface PathSettings {
  keysPath: string;
  filesPath: string;
  downloadPath: string;
  region: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PathSettings;
  onSettingsChange: (settings: PathSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
  if (!isOpen) return null;

  const fields = [
    { key: 'keysPath' as const, label: 'Keys Path', placeholder: './keys' },
    { key: 'downloadPath' as const, label: 'Download Path', placeholder: './download' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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

        <p className="text-xs text-gray-400 mt-4">
          Paths are relative to the project root or absolute.
        </p>
      </div>
    </div>
  );
}
