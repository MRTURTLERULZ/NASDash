import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { normalizePath, normalizePathForUser, getRelativePath, getRelativePathForUser } from './pathUtils';

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
 * Lists directory contents for a specific user
 */
export async function listDirectory(
  relativePath: string = '/',
  userFolder: string = '/',
  isAdmin: boolean = false
): Promise<{
  currentPath: string;
  items: FileItem[];
}> {
  const normalizedPath = normalizePathForUser(relativePath, userFolder, isAdmin);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  try {
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    let entries;
    try {
      entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    } catch (readError) {
      // If we can't read the directory, return empty list with a warning
      const errorMsg = readError instanceof Error ? readError.message : 'Unknown error';
      if (errorMsg.includes('EACCES') || errorMsg.includes('permission denied')) {
        console.warn(`Permission denied reading directory ${normalizedPath}`);
        return {
          currentPath: getRelativePathForUser(normalizedPath, userFolder, isAdmin),
          items: [],
        };
      }
      throw readError;
    }

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
          path: getRelativePathForUser(fullPath, userFolder, isAdmin),
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
      currentPath: getRelativePathForUser(normalizedPath, userFolder, isAdmin),
      items,
    };
  } catch (error) {
    throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets storage statistics for a specific user's folder
 */
export async function getStorageStats(userFolder: string = '/', isAdmin: boolean = false): Promise<StorageStats> {
  try {
    // Determine the root path for this user
    const userRootPath = isAdmin && userFolder === '/' 
      ? FILE_ROOT 
      : path.join(FILE_ROOT, userFolder);
    
    // Check if user's root exists
    let rootExists = false;
    try {
      await fs.access(userRootPath);
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
      // For admin users, show full disk stats. For regular users, we'll calculate folder size
      if (isAdmin && userFolder === '/') {
        // Admin: show full disk stats
        if (isWindows) {
          // Windows: use wmic to get disk info
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
      } else {
        // Regular users: calculate folder size (du command on Linux)
        // For now, set to 0 - could implement folder size calculation later
        total = 0;
        used = 0;
        free = 0;
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
      await countItems(userRootPath);
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
 * Uploads a file to the specified directory for a specific user
 */
export async function uploadFile(
  file: File,
  relativePath: string = '/',
  userFolder: string = '/',
  isAdmin: boolean = false
): Promise<void> {
  const normalizedPath = normalizePathForUser(relativePath, userFolder, isAdmin);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  try {
    // Check if we can write to the directory
    try {
      await fs.access(normalizedPath, fsSync.constants.W_OK);
    } catch (accessError) {
      throw new Error(`Permission denied: Cannot write to directory. Please check file permissions for ${normalizedPath}`);
    }

    // Ensure directory exists
    await fs.mkdir(normalizedPath, { recursive: true });

    const filePath = path.join(normalizedPath, file.name);
    
    // Validate the file path is still within user's allowed area
    const normalizedFilePath = normalizePathForUser(
      path.relative(isAdmin && userFolder === '/' ? FILE_ROOT : path.join(FILE_ROOT, userFolder), filePath),
      userFolder,
      isAdmin
    );
    if (!normalizedFilePath) {
      throw new Error('Invalid file path');
    }

    // Convert File to Buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(normalizedFilePath, buffer);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permission denied')) {
      throw error;
    }
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a file or directory recursively for a specific user
 */
export async function deleteItem(
  relativePath: string,
  userFolder: string = '/',
  isAdmin: boolean = false
): Promise<void> {
  const normalizedPath = normalizePathForUser(relativePath, userFolder, isAdmin);
  
  if (!normalizedPath) {
    throw new Error('Invalid path');
  }

  // Prevent deleting the root directory
  const root = path.resolve(FILE_ROOT);
  const userRoot = isAdmin && userFolder === '/' 
    ? root 
    : path.resolve(FILE_ROOT, userFolder);
  
  if (normalizedPath === root || normalizedPath === userRoot) {
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
 * Gets file stats for download for a specific user
 */
export async function getFileStats(
  relativePath: string,
  userFolder: string = '/',
  isAdmin: boolean = false
): Promise<{
  path: string;
  size: number;
  mime: string;
}> {
  const normalizedPath = normalizePathForUser(relativePath, userFolder, isAdmin);
  
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

