import fs from 'fs';
import path from 'path';

export interface User {
  username: string;
  password: string;
  folder: string;
  isAdmin: boolean;
}

let usersCache: User[] | null = null;

/**
 * Loads users from users.json file
 */
function loadUsers(): User[] {
  if (usersCache) {
    return usersCache;
  }

  // Try multiple possible locations
  const possiblePaths = [
    path.join(process.cwd(), 'users.json'),
    path.join(__dirname, '..', 'users.json'),
    path.join(process.cwd(), '..', 'users.json'),
  ];

  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  
  for (const usersPath of possiblePaths) {
    console.log('Trying to load users from:', usersPath);
    
    try {
      if (fs.existsSync(usersPath)) {
        const fileContent = fs.readFileSync(usersPath, 'utf-8');
        const data = JSON.parse(fileContent);
        usersCache = data.users || [];
        console.log(`✓ Loaded ${usersCache.length} users from: ${usersPath}`);
        return usersCache;
      }
    } catch (error) {
      console.error(`Error loading users.json from ${usersPath}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Continue to next path
    }
  }

  // Fallback to empty array if file doesn't exist
  console.error('✗ users.json not found in any of the expected locations');
  console.warn('No users loaded - returning empty array');
  usersCache = [];
  return usersCache;
}

/**
 * Gets a user by username
 */
export function getUser(username: string): User | null {
  const users = loadUsers();
  return users.find(u => u.username === username) || null;
}

/**
 * Validates user credentials
 */
export function validateUser(username: string, password: string): User | null {
  const user = getUser(username);
  if (!user) {
    return null;
  }

  // Simple password comparison (for now - can be upgraded to bcrypt later)
  if (user.password === password) {
    return user;
  }

  return null;
}

/**
 * Gets the folder path for a user
 */
export function getUserFolder(username: string): string {
  const user = getUser(username);
  if (!user) {
    return '/';
  }

  // Admin users with folder "/" have access to everything
  if (user.isAdmin && user.folder === '/') {
    return '/';
  }

  // Regular users get their folder
  return user.folder;
}

/**
 * Checks if a user is an admin
 */
export function isAdmin(username: string): boolean {
  const user = getUser(username);
  return user?.isAdmin || false;
}

/**
 * Clears the users cache (useful for testing or reloading)
 */
export function clearUsersCache(): void {
  usersCache = null;
}

