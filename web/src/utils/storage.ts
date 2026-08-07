import type { FileItem } from "../data/mockFiles";
import { formatSize } from "./format";

export function getTotalStorageSize(files: FileItem[]): string {
    const bytes = files.reduce((total, file) => total + file.size, 0);
    return formatSize(bytes);
}