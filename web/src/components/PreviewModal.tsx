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
    onClose();
  }

  function renderContent() {
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
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 overflow-auto max-h-[70vh] whitespace-pre-wrap break-words font-mono">
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
          className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
        />
      );
    }

    if (contentType.startsWith('video/')) {
      return (
        <video
          src={objectUrl}
          controls
          className="max-w-full max-h-[70vh] mx-auto rounded-lg"
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
          className="w-full h-[70vh] rounded-lg border border-gray-200"
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-800 truncate">{fileName}</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            aria-label="Close preview"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 overflow-auto max-h-[calc(90vh-56px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
