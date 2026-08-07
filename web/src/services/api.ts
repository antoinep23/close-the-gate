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
