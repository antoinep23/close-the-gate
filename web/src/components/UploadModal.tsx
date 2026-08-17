import { useState, useRef, useEffect } from 'react';
import { AiOutlineClose, AiOutlineCloudUpload } from 'react-icons/ai';
import { uploadFile } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: string[];
  onUploadSuccess: (fileName: string) => void;
  onUploadError: (fileName: string, error: string) => void;
}

export function UploadModal({ isOpen, onClose, keys, onUploadSuccess, onUploadError }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedKey, setSelectedKey] = useState(keys[0] || '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedKey && keys.length > 0) {
      setSelectedKey(keys[0]);
    }
  }, [keys, selectedKey]);

  if (!isOpen) return null;

  async function handleUpload() {
    if (!selectedFile || !selectedKey) return;

    setUploading(true);
    setProgress(0);
    setPhase('transfer');
    const result = await uploadFile(selectedFile, selectedKey, (percent, info) => {
      setProgress(percent);
      setPhase(info.phase);
    });
    setUploading(false);

    if (result.success) {
      onUploadSuccess(selectedFile.name);
      setSelectedFile(null);
      setProgress(0);
      onClose();
    } else {
      setProgress(0);
      onUploadError(selectedFile.name, result.error || 'Unknown error');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function getPhaseLabel(phase: string): string {
    switch (phase) {
      case 'transfer': return 'Transferring file...';
      case 'reading': return 'Reading file...';
      case 'encrypting': return 'Encrypting...';
      case 's3': return 'Uploading to cloud...';
      case 'metadata': return 'Saving metadata...';
      case 'complete': return 'Done!';
      default: return 'Processing...';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-800">Upload File</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        >
          <AiOutlineCloudUpload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          {selectedFile ? (
            <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Click or drag a file here</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
        </div>

        {/* Key selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Encryption Key</label>
          {keys.length === 0 ? (
            <p className="text-sm text-red-500">No keys available. Generate one first.</p>
          ) : (
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            >
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          )}
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">
                {getPhaseLabel(phase)}
              </span>
              <span className="text-xs font-medium text-blue-600">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !selectedKey || uploading}
          className="mt-6 w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {uploading ? 'Uploading...' : 'Encrypt & Upload'}
        </button>
      </div>
    </div>
  );
}
