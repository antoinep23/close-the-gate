import type { FileItem } from '../data/mockFiles';

export function getSectionTitle(section: string): string {
  if (section === 'my-drive') return 'All Files';
  if (section === 'starred') return 'Starred';
  if (section === 'downloaded') return 'Downloaded';
  if (section.startsWith('category-')) {
    const cat = section.replace('category-', '');
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return '';
}

export function getSubFolders(currentFolder: string, allFolders: string[]): string[] {
  const prefix = currentFolder === '/' ? '/' : currentFolder + '/';
  return allFolders.filter((f) => {
    if (f === currentFolder) return false;
    if (!f.startsWith(prefix)) return false;
    const remainder = f.slice(prefix.length);
    return remainder.length > 0 && !remainder.includes('/');
  });
}

export function computeFolderSizes(allFiles: FileItem[], subFolders: string[]): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const folder of subFolders) {
    sizes[folder] = allFiles
      .filter((f) => {
        const fileFolder = f.folder || '/';
        return fileFolder === folder || fileFolder.startsWith(folder + '/');
      })
      .reduce((sum, f) => sum + f.size, 0);
  }
  return sizes;
}
