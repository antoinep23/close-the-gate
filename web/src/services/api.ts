export async function downloadFile(fileName: string, keyName: string): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  const res = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, keyName }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Download failed' };
  }

  return { success: true, outputPath: data.outputPath };
}

export async function openFile(fileName: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to open file' };
  }

  return { success: true };
}

export async function toggleStar(fileName: string, isStarred: boolean): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileName)}/star`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isStarred }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to toggle star' };
  }

  return { success: true };
}

export interface UploadProgressInfo {
  phase: string;
  percent: number;
}

/**
 * Upload a file with real progress tracking across both phases:
 * - Phase 1 (0-50%): Browser → Server transfer (XHR progress)
 * - Phase 2 (50-100%): Server-side encryption + S3 upload (SSE progress)
 */
export function uploadFile(
  file: globalThis.File,
  keyName: string,
  onProgress?: (percent: number, info: UploadProgressInfo) => void
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('keyName', keyName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    // Phase 1: Track network transfer (0% - 50%)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 50);
        onProgress(percent, { phase: 'transfer', percent });
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.uploadId) {
          // Phase 1 complete, start Phase 2: subscribe to SSE for server progress
          if (onProgress) onProgress(50, { phase: 'transfer', percent: 100 });
          subscribeToServerProgress(data.uploadId, onProgress, resolve);
        } else {
          resolve({ success: false, error: data.error || 'Upload failed' });
        }
      } catch {
        resolve({ success: false, error: 'Invalid server response' });
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, error: 'Network error' });
    };

    xhr.send(formData);
  });
}

/**
 * Subscribe to the SSE endpoint for server-side progress (encryption + S3 + metadata).
 * Maps server progress (0-100%) into the overall range (50-100%).
 */
function subscribeToServerProgress(
  uploadId: string,
  onProgress: ((percent: number, info: UploadProgressInfo) => void) | undefined,
  resolve: (result: { success: boolean; error?: string }) => void
) {
  const eventSource = new EventSource(`/api/upload/progress/${uploadId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as { phase: string; percent: number; done: boolean; error?: string };

      if (data.done) {
        eventSource.close();
        if (data.error) {
          resolve({ success: false, error: data.error });
        } else {
          if (onProgress) onProgress(100, { phase: 'complete', percent: 100 });
          resolve({ success: true });
        }
        return;
      }

      // Map server-side progress into overall 50-100% range
      if (onProgress) {
        const serverPercent = mapServerPhaseToPercent(data.phase, data.percent);
        const overall = 50 + Math.round(serverPercent * 0.5);
        onProgress(overall, { phase: data.phase, percent: data.percent });
      }
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    resolve({ success: false, error: 'Lost connection to upload progress' });
  };
}

/**
 * Convert server phase + percent into a linear 0-100 scale representing server-side work.
 * Phases: reading (0-5%), encrypting (5-15%), s3 (15-95%), metadata (95-100%)
 */
function mapServerPhaseToPercent(phase: string, percent: number): number {
  switch (phase) {
    case 'reading':
      return Math.round(percent * 0.05);
    case 'encrypting':
      return 5 + Math.round(percent * 0.10);
    case 's3':
      return 15 + Math.round(percent * 0.80);
    case 'metadata':
      return 95 + Math.round(percent * 0.05);
    case 'complete':
      return 100;
    default:
      return 0;
  }
}

export async function deleteFile(fileName: string, keyName: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyName }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Delete failed' };
  }

  return { success: true };
}

export async function deleteLocalFile(fileName: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/downloaded/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to delete local file' };
  }

  return { success: true };
}

export async function generateKey(keyName?: string, bytes?: number): Promise<{ success: boolean; keyName?: string; error?: string }> {
  const res = await fetch('/api/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyName: keyName || undefined, bytes: bytes || 32 }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Key generation failed' };
  }

  return { success: true, keyName: data.keyName };
}

export async function deleteKey(keyName: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/keys/${encodeURIComponent(keyName)}`, {
    method: 'DELETE',
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Key deletion failed' };
  }

  return { success: true };
}
