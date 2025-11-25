import path from 'path';
import fs from 'fs';

const FILE_ROOT = process.env.FILE_ROOT || '/mnt/ssd';

/**
 * Normalizes and validates a path relative to FILE_ROOT.
 * Prevents path traversal attacks.
 * 
 * @param userPath - Path provided by user (relative or absolute)
 * @returns Normalized absolute path within FILE_ROOT, or null if invalid
 */
export function normalizePath(userPath: string): string | null {
  if (!userPath) {
    return FILE_ROOT;
  }

  // Remove any leading/trailing slashes and normalize
  const cleanPath = userPath.trim().replace(/^\/+|\/+$/g, '');
  
  // Block path traversal attempts
  if (cleanPath.includes('..') || path.isAbsolute(cleanPath)) {
    // If it's an absolute path, check if it's within FILE_ROOT
    if (path.isAbsolute(cleanPath)) {
      const resolved = path.resolve(cleanPath);
      const root = path.resolve(FILE_ROOT);
      if (!resolved.startsWith(root + path.sep) && resolved !== root) {
        return null; // Outside FILE_ROOT
      }
      return resolved;
    }
    return null; // Contains .. or is absolute outside root
  }

  // Resolve relative path
  const resolved = path.resolve(FILE_ROOT, cleanPath);
  const root = path.resolve(FILE_ROOT);

  // Ensure resolved path is within FILE_ROOT
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }

  return resolved;
}

/**
 * Converts an absolute path back to a relative path from FILE_ROOT
 * for display purposes.
 */
export function getRelativePath(absolutePath: string): string {
  const root = path.resolve(FILE_ROOT);
  const resolved = path.resolve(absolutePath);
  
  if (resolved === root) {
    return '/';
  }
  
  if (resolved.startsWith(root + path.sep)) {
    return '/' + path.relative(root, resolved).replace(/\\/g, '/');
  }
  
  return '/';
}

/**
 * Validates that a path exists and is accessible
 */
export function validatePathExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

