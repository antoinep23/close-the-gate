export interface FileItem {
  fileName: string;
  size: number;
  uploadDate: string;
  isStarred: boolean;
  isProtected: boolean;
  folder: string;
  lastOpenedAt: string | null;
  keyName: string;
}
