import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineShareAlt, AiOutlineCopy, AiOutlineCheck, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { shareFile } from '../services/api';

interface ShareModalProps {
  isOpen: boolean;
  fileName: string;
  keyName: string;
  onClose: () => void;
  onError: (fileName: string, error: string) => void;
}

export function ShareModal({ isOpen, fileName, keyName, onClose, onError }: ShareModalProps) {
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate a fresh link every time the modal opens for a file.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLink('');
    setCopied(false);
    setGenerating(true);

    (async () => {
      const result = await shareFile(fileName, keyName);
      if (cancelled) return;
      setGenerating(false);
      if (result.success && result.link) {
        setLink(result.link);
      } else {
        onError(fileName, result.error || 'Failed to generate share link');
        onClose();
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, fileName, keyName]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on non-secure contexts; fall back to selecting.
      const input = document.getElementById('share-link-input') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <AiOutlineShareAlt className="w-5 h-5 text-blue-600" />
            Share file
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 truncate">{fileName}</p>
          </div>

          {generating ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
              Generating secure link…
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Share link</label>
              <div className="flex items-center gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors whitespace-nowrap"
                  title="Copy link"
                >
                  {copied ? <AiOutlineCheck className="w-4 h-4" /> : <AiOutlineCopy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                Anyone with this link can view the file. The decryption key is embedded in the
                link and is never sent to the server. Delete the shared object to revoke access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
