/**
 * authService.ts
 * Secure Role-Based Access Control (RBAC) & Authentication Service.
 *
 * Security features:
 * - Passwords are NEVER stored in plain-text.
 * - Cryptographic SHA-256 with per-user unique salt via Web Crypto API.
 * - Protected session token generation with configurable expiration (8 hours).
 * - Client-side & service-level permission assertion.
 * - 403 Forbidden enforcement on unauthorized mutations.
 */

export type UserRole = 'COLLEGE_VIEWER' | 'RAREMINDS_ADMIN';

export type Permission =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'UPLOAD'
  | 'IMPORT'
  | 'EXPORT'
  | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  salt: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number; // Unix timestamp in ms
}

// ─── Role Permissions Mapping ────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  COLLEGE_VIEWER: ['READ'],
  RAREMINDS_ADMIN: [
    'READ',
    'CREATE',
    'UPDATE',
    'DELETE',
    'UPLOAD',
    'IMPORT',
    'EXPORT',
    'ADMIN',
  ],
};

// ─── Storage Keys ────────────────────────────────────────────────────────────
const USERS_STORAGE_KEY = 'rareminds_portal_users_db_v1';
const SESSION_STORAGE_KEY = 'rareminds_portal_auth_session_v1';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Initial Pre-Seeded Hashed Accounts ──────────────────────────────────────
// Plain-text passwords are NOT in this code or in bundle.
// Salting + SHA-256 cryptographic verification is used.
const INITIAL_USERS: UserRecord[] = [
  {
    id: 'USR-SIMS-001',
    email: 'sims.info@soundaryainstitutions.in',
    name: 'Soundarya Institutions (SIMS)',
    role: 'COLLEGE_VIEWER',
    organization: 'Soundarya Institute of Management and Science',
    salt: '2ee54a08228ca4901d712879786cf465',
    password_hash: 'f1152fc1257d8fe7c8b854799cbe15818a84e70fdace81714f1eadc461d4d626',
    created_at: '2026-10-06T00:00:00.000Z',
    updated_at: '2026-10-06T00:00:00.000Z',
  },
  {
    id: 'USR-RM-001',
    email: 'admin@rareminds.in',
    name: 'Rareminds System Admin',
    role: 'RAREMINDS_ADMIN',
    organization: 'Rareminds Career Solutions',
    salt: '9c693e83963e35cf8a35ad3b038138e0',
    password_hash: '4c75ce38f459435024b773f1e5128e67f48952cf1d82a5bf0764e121a283f7a1',
    created_at: '2026-10-06T00:00:00.000Z',
    updated_at: '2026-10-06T00:00:00.000Z',
  },
];

// ─── 403 Forbidden Error Class ───────────────────────────────────────────────
export class AuthForbiddenError extends Error {
  status: number = 403;
  constructor(message = '403 Forbidden: Insufficient permissions for this action.') {
    super(message);
    this.name = 'AuthForbiddenError';
  }
}

// ─── Password Hash Utilities ─────────────────────────────────────────────────
/**
 * Hashes password with user-specific salt using standard Web Crypto API SHA-256.
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── User Database Access ────────────────────────────────────────────────────
export function getRegisteredUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return parsed;
  } catch {
    return INITIAL_USERS;
  }
}

// ─── Session Management ──────────────────────────────────────────────────────
export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    // Check expiration
    if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
      clearAuthSession();
      return null;
    }
    // Normalize casing for display consistency
    if (session.user) {
      let changed = false;
      if (session.user.name && session.user.name.includes('RareMinds')) {
        session.user.name = session.user.name.replace(/RareMinds/g, 'Rareminds');
        changed = true;
      }
      if (session.user.organization && session.user.organization.includes('RareMinds')) {
        session.user.organization = session.user.organization.replace(/RareMinds/g, 'Rareminds');
        changed = true;
      }
      if (changed) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    }
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to persist auth session:', err);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth session:', err);
  }
}

export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

export function getCurrentUser(): AuthUser | null {
  const session = getAuthSession();
  return session ? session.user : null;
}

export function getCurrentUserRole(): UserRole | null {
  const session = getAuthSession();
  return session ? session.user.role : null;
}

// ─── RBAC Permission Checks ──────────────────────────────────────────────────
export function hasPermission(permission: Permission): boolean {
  const role = getCurrentUserRole();
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Asserts that the current session has the given permission.
 * Throws 403 Forbidden (AuthForbiddenError) if unauthorized.
 */
export function assertPermission(permission: Permission, action = 'perform this operation'): void {
  const session = getAuthSession();
  if (!session) {
    throw new AuthForbiddenError('401 Unauthorized: Session required to ' + action);
  }
  const permissions = ROLE_PERMISSIONS[session.user.role] || [];
  if (!permissions.includes(permission)) {
    throw new AuthForbiddenError(
      `403 Forbidden: Role '${session.user.role}' is not authorized to ${action}.`
    );
  }
}

// ─── Login & Authentication Workflow ─────────────────────────────────────────
export async function authenticateUser(
  email: string,
  plainPassword: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !plainPassword) {
    return { success: false, error: 'Email and password are required.' };
  }

  const users = getRegisteredUsers();
  const userRecord = users.find(u => u.email.toLowerCase() === trimmedEmail);

  if (!userRecord) {
    return { success: false, error: 'Invalid email address or password.' };
  }

  try {
    const computedHash = await hashPasswordWithSalt(plainPassword, userRecord.salt);
    if (computedHash !== userRecord.password_hash) {
      return { success: false, error: 'Invalid email address or password.' };
    }

    // Generate secure cryptographically random session token
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const session: AuthSession = {
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        organization: userRecord.organization,
      },
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };

    setAuthSession(session);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}

export function logout(): void {
  clearAuthSession();
}
