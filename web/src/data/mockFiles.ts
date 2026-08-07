export interface FileItem {
  fileName: string;
  size: number;
  uploadDate: string;
}

// Fallback mock data used when the API is unreachable
export const mockFiles: FileItem[] = [
  { fileName: 'report-q2-2026.pdf', size: 2_450_000, uploadDate: '2026-08-03T10:30:00Z' },
  { fileName: 'architecture-diagram.png', size: 890_000, uploadDate: '2026-07-20T14:00:00Z' },
  { fileName: 'meeting-notes.md', size: 12_400, uploadDate: '2026-08-06T09:15:00Z' },
  { fileName: 'budget-2026.xlsx', size: 156_000, uploadDate: '2026-07-10T16:45:00Z' },
  { fileName: 'presentation.pptx', size: 4_200_000, uploadDate: '2026-08-02T11:20:00Z' },
  { fileName: 'config.json', size: 2_300, uploadDate: '2026-08-07T08:00:00Z' },
  { fileName: 'deploy.sh', size: 4_500, uploadDate: '2026-07-30T17:30:00Z' },
  { fileName: 'video-demo.mp4', size: 52_000_000, uploadDate: '2026-07-25T13:10:00Z' },
  { fileName: 'photo-vacation.jpg', size: 3_800_000, uploadDate: '2026-06-15T20:00:00Z' },
  { fileName: 'app.ts', size: 8_200, uploadDate: '2026-08-05T12:00:00Z' },
];
