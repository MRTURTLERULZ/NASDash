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
 * Normalizes and validates a path for a specific user.
 * Restricts paths to the user's folder (unless admin).
 * 
 * @param userPath - Path provided by user (relative or absolute)
 * @param userFolder - User's assigned folder (e.g., "alice" or "/" for admin)
 * @param isAdmin - Whether the user is an admin
 * @returns Normalized absolute path within user's folder, or null if invalid
 */
export function normalizePathForUser(userPath: string, userFolder: string, isAdmin: boolean): string | null {
  // Admin users with folder "/" have access to everything
  if (isAdmin && userFolder === '/') {
    return normalizePath(userPath);
  }

  // For regular users, restrict to their folder
  if (!userPath || userPath === '/') {
    // Root path for user means their folder
    const userRoot = path.join(FILE_ROOT, userFolder);
    return path.resolve(userRoot);
  }

  // Remove any leading/trailing slashes and normalize
  const cleanPath = userPath.trim().replace(/^\/+|\/+$/g, '');
  
  // Block path traversal attempts
  if (cleanPath.includes('..')) {
    return null;
  }

  // Resolve path relative to user's folder
  const userRoot = path.join(FILE_ROOT, userFolder);
  const resolved = path.resolve(userRoot, cleanPath);
  const root = path.resolve(userRoot);
  const fileRoot = path.resolve(FILE_ROOT);

  // Ensure resolved path is within user's folder AND within FILE_ROOT
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  
  if (!resolved.startsWith(fileRoot + path.sep) && resolved !== fileRoot) {
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
 * Converts an absolute path back to a relative path from user's folder
 * for display purposes.
 */
export function getRelativePathForUser(absolutePath: string, userFolder: string, isAdmin: boolean): string {
  // Admin users see paths relative to FILE_ROOT
  if (isAdmin && userFolder === '/') {
    return getRelativePath(absolutePath);
  }

  // Regular users see paths relative to their folder
  const userRoot = path.resolve(FILE_ROOT, userFolder);
  const resolved = path.resolve(absolutePath);
  
  if (resolved === userRoot) {
    return '/';
  }
  
  if (resolved.startsWith(userRoot + path.sep)) {
    return '/' + path.relative(userRoot, resolved).replace(/\\/g, '/');
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

