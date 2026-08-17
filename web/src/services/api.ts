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

export async function uploadFile(file: globalThis.File, keyName: string): Promise<{ success: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('keyName', keyName);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || 'Upload failed' };
  }

  return { success: true };
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
