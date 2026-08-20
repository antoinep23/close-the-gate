import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { previewFile } from '../services/api';

interface PreviewModalProps {
  isOpen: boolean;
  fileName: string;
  keyName: string;
  onClose: () => void;
  onError: (fileName: string, error: string) => void;
}

export function PreviewModal({ isOpen, fileName, keyName, onClose, onError }: PreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen || !fileName || !keyName) return;

    let revoked = false;

    async function load() {
      setLoading(true);
      setObjectUrl(null);
      setTextContent(null);

      const result = await previewFile(fileName, keyName);

      if (!result.success || !result.blob) {
        setLoading(false);
        onError(fileName, result.error || 'Preview failed');
        onClose();
        return;
      }

      const type = result.contentType || 'application/octet-stream';
      setContentType(type);

      if (type.startsWith('text/') || type === 'application/json') {
        const text = await result.blob.text();
        setTextContent(text);
      } else {
        const url = URL.createObjectURL(result.blob);
        if (!revoked) setObjectUrl(url);
      }

      setLoading(false);
    }

    load();

    return () => {
      revoked = true;
      // Cleanup on unmount / close
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTextContent(null);
    };
  }, [isOpen, fileName, keyName]);

  if (!isOpen) return null;

  function handleClose() {
    // Revoke object URL to free memory
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setTextContent(null);
    setFullscreen(false);
    onClose();
  }

  function renderContent() {
    const maxH = fullscreen ? 'max-h-[calc(100vh-56px)]' : 'max-h-[85vh]';

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AiOutlineLoading3Quarters className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Decrypting preview...</p>
        </div>
      );
    }

    if (textContent !== null) {
      return (
        <pre className={`bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 overflow-auto ${maxH} whitespace-pre-wrap break-words font-mono`}>
          {textContent}
        </pre>
      );
    }

    if (!objectUrl) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>Unable to preview this file</p>
        </div>
      );
    }

    if (contentType.startsWith('image/')) {
      return (
        <img
          src={objectUrl}
          alt={fileName}
          className={`max-w-full ${maxH} object-contain mx-auto rounded-lg`}
        />
      );
    }

    if (contentType.startsWith('video/')) {
      return (
        <video
          src={objectUrl}
          controls
          className={`max-w-full ${maxH} mx-auto rounded-lg`}
        />
      );
    }

    if (contentType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center py-12">
          <audio src={objectUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    if (contentType === 'application/pdf') {
      return (
        <iframe
          src={objectUrl}
          title={fileName}
          className={`w-full ${fullscreen ? 'h-[calc(100vh-56px)]' : 'h-[85vh]'} rounded-lg border border-gray-200`}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Preview not available for this file type</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose}></div>
      <div className={`relative bg-white shadow-xl overflow-hidden transition-all duration-200 ${
        fullscreen
          ? 'inset-0 absolute rounded-none w-full h-full max-w-none max-h-none mx-0'
          : 'rounded-xl w-full max-w-6xl max-h-[95vh] mx-4'
      }`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-800 truncate">{fileName}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? (
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4,14 4,20 10,20" />
                  <polyline points="20,10 20,4 14,4" />
                  <line x1="14" y1="10" x2="20" y2="4" />
                  <line x1="4" y1="20" x2="10" y2="14" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,3 21,3 21,9" />
                  <polyline points="9,21 3,21 3,15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
              aria-label="Close preview"
            >
              <AiOutlineClose className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className={`p-5 overflow-auto ${fullscreen ? 'max-h-[calc(100vh-56px)]' : 'max-h-[calc(95vh-56px)]'}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
