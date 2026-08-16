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
