export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType?: string;
  size?: number;
  lastModified: string;
  path: string;
}

export const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Documents',
    type: 'folder',
    lastModified: '2026-08-01',
    path: '/Documents',
  },
  {
    id: '2',
    name: 'Photos',
    type: 'folder',
    lastModified: '2026-07-28',
    path: '/Photos',
  },
  {
    id: '3',
    name: 'Projects',
    type: 'folder',
    lastModified: '2026-08-05',
    path: '/Projects',
  },
  {
    id: '4',
    name: 'Backups',
    type: 'folder',
    lastModified: '2026-06-15',
    path: '/Backups',
  },
  {
    id: '5',
    name: 'report-q2-2026.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    size: 2_450_000,
    lastModified: '2026-08-03',
    path: '/report-q2-2026.pdf',
  },
  {
    id: '6',
    name: 'architecture-diagram.png',
    type: 'file',
    mimeType: 'image/png',
    size: 890_000,
    lastModified: '2026-07-20',
    path: '/architecture-diagram.png',
  },
  {
    id: '7',
    name: 'meeting-notes.md',
    type: 'file',
    mimeType: 'text/markdown',
    size: 12_400,
    lastModified: '2026-08-06',
    path: '/meeting-notes.md',
  },
  {
    id: '8',
    name: 'budget-2026.xlsx',
    type: 'file',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 156_000,
    lastModified: '2026-07-10',
    path: '/budget-2026.xlsx',
  },
  {
    id: '9',
    name: 'presentation.pptx',
    type: 'file',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 4_200_000,
    lastModified: '2026-08-02',
    path: '/presentation.pptx',
  },
  {
    id: '10',
    name: 'config.json',
    type: 'file',
    mimeType: 'application/json',
    size: 2_300,
    lastModified: '2026-08-07',
    path: '/config.json',
  },
  {
    id: '11',
    name: 'deploy.sh',
    type: 'file',
    mimeType: 'application/x-sh',
    size: 4_500,
    lastModified: '2026-07-30',
    path: '/deploy.sh',
  },
  {
    id: '12',
    name: 'video-demo.mp4',
    type: 'file',
    mimeType: 'video/mp4',
    size: 52_000_000,
    lastModified: '2026-07-25',
    path: '/video-demo.mp4',
  },
];
