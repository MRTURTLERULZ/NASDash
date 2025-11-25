import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { normalizePath, getRelativePath } from './pathUtils';

const execAsync = promisify(exec);
const FILE_ROOT = process.env.FILE_ROOT || '/mnt/ssd';

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified: string;
  path: string;
}

export interface StorageStats {
  total: number;
  used: number;
  free: number;
  fileCount: number;
  folderCount: number;
}

/**
 * Lists directory contents
 */
export async function listDirectory(relativePath: string = '/'): Promise<{
  currentPath: string;
  items: FileItem[];
}> {
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  try {
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    const items: FileItem[] = [];

    for (const entry of entries) {
      const fullPath = path.join(normalizedPath, entry.name);
      try {
        const stat = await fs.stat(fullPath);
        items.push({
          name: entry.name,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.isDirectory() ? null : stat.size,
          modified: stat.mtime.toISOString(),
          path: getRelativePath(fullPath),
        });
      } catch (err) {
        // Skip files we can't stat (permissions, etc.)
        console.warn(`Could not stat ${fullPath}:`, err);
      }
    }

    // Sort: directories first, then by name
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      currentPath: getRelativePath(normalizedPath),
      items,
    };
  } catch (error) {
    throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets storage statistics for the FILE_ROOT
 */
export async function getStorageStats(): Promise<StorageStats> {
  try {
    // Check if FILE_ROOT exists
    let rootExists = false;
    try {
      await fs.access(FILE_ROOT);
      rootExists = true;
    } catch {
      // Directory doesn't exist - return zeros
      return {
        total: 0,
        used: 0,
        free: 0,
        fileCount: 0,
        folderCount: 0,
      };
    }

    // Try to get disk stats - cross-platform
    let total = 0;
    let used = 0;
    let free = 0;

    const isWindows = process.platform === 'win32';
    
    try {
      if (isWindows) {
        // Windows: use wmic to get disk info
        // Get the drive letter from the path
        const driveLetter = path.parse(FILE_ROOT).root.replace(/[\\/]/g, '');
        if (driveLetter) {
          const { stdout } = await execAsync(
            `wmic logicaldisk where "DeviceID='${driveLetter}'" get Size,FreeSpace /format:value`
          );
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (line.startsWith('Size=')) {
              total = parseInt(line.split('=')[1].trim(), 10);
            } else if (line.startsWith('FreeSpace=')) {
              free = parseInt(line.split('=')[1].trim(), 10);
            }
          }
          used = total - free;
        }
      } else {
        // Linux/Unix: use df command
        const { stdout } = await execAsync(`df -B1 "${FILE_ROOT}"`);
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          total = parseInt(parts[1], 10) || 0;
          used = parseInt(parts[2], 10) || 0;
          free = parseInt(parts[3], 10) || 0;
        }
      }
    } catch (err) {
      // If we can't get disk stats, just set to 0
      // This is fine for development/testing
      console.warn('Could not get disk stats:', err);
      total = 0;
      used = 0;
      free = 0;
    }

    // Count files and folders
    let fileCount = 0;
    let folderCount = 0;

    async function countItems(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          try {
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
              folderCount++;
              await countItems(fullPath);
            } else {
              fileCount++;
            }
          } catch {
            // Skip items we can't access
          }
        }
      } catch {
        // Skip directories we can't access
      }
    }

    if (rootExists) {
      await countItems(FILE_ROOT);
    }

    return {
      total,
      used,
      free,
      fileCount,
      folderCount,
    };
  } catch (error) {
    throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Uploads a file to the specified directory
 */
export async function uploadFile(
  file: File,
  relativePath: string = '/'
): Promise<void> {
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  try {
    // Ensure directory exists
    await fs.mkdir(normalizedPath, { recursive: true });

    const filePath = path.join(normalizedPath, file.name);
    
    // Validate the file path is still within FILE_ROOT
    const normalizedFilePath = normalizePath(path.relative(FILE_ROOT, filePath));
    if (!normalizedFilePath) {
      throw new Error('Invalid file path');
    }

    // Convert File to Buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(normalizedFilePath, buffer);
  } catch (error) {
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a file or directory recursively
 */
export async function deleteItem(relativePath: string): Promise<void> {
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  // Prevent deleting the root directory
  const root = path.resolve(FILE_ROOT);
  if (normalizedPath === root) {
    throw new Error('Cannot delete root directory');
  }

  try {
    const stats = await fs.stat(normalizedPath);
    
    if (stats.isDirectory()) {
      await fs.rm(normalizedPath, { recursive: true, force: true });
    } else {
      await fs.unlink(normalizedPath);
    }
  } catch (error) {
    throw new Error(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets file stats for download
 */
export async function getFileStats(relativePath: string): Promise<{
  path: string;
  size: number;
  mime: string;
}> {
  const normalizedPath = normalizePath(relativePath);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  try {
    const stats = await fs.stat(normalizedPath);
    
    if (stats.isDirectory()) {
      throw new Error('Path is a directory');
    }

    // Simple MIME type detection
    const ext = path.extname(normalizedPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };

    return {
      path: normalizedPath,
      size: stats.size,
      mime: mimeTypes[ext] || 'application/octet-stream',
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

