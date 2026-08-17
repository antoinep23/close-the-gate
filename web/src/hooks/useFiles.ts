import { useState, useEffect, useCallback } from 'react';
import type { FileItem } from '../data/mockFiles';

export function useFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch('/api/files');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: FileItem[] = await res.json();
        setFiles(data);
        setError(null);
      } catch (err) {
        console.warn('API unavailable: ', err);
        setFiles([]);
        setError('Failed to fetch files. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  const updateFileStar = useCallback((fileName: string, isStarred: boolean) => {
    setFiles((prev) =>
      prev.map((f) => (f.fileName === fileName ? { ...f, isStarred } : f))
    );
  }, []);

  return { files, loading, error, updateFileStar };
}
