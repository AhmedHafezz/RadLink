/**
 * auth.ts
 * JWT and authentication utilities for the RadLink frontend.
 *
 * Storage strategy:
 *  - Access token  → localStorage  (key: "radlink_token")
 *  - Refresh token → localStorage  (key: "radlink_refresh_token")
 *
 * Note: For HIPAA-grade deployments consider httpOnly cookies via
 * a Next.js API route proxy instead of localStorage. This helper
 * is designed so callers can be swapped to cookie-based storage
 * with minimal changes.
 */

import type { AuthUser, TokenPayload } from '@/types/tenant';

// ─── Storage keys ────────────────────────────

const TOKEN_KEY = 'radlink_token';
const REFRESH_TOKEN_KEY = 'radlink_refresh_token';

// ─── Low-level token storage ─────────────────

/**
 * Persist the access token in localStorage.
 * Silently no-ops in SSR environments.
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage may be blocked (private browsing quota exceeded, etc.)
    console.warn('[RadLink] Failed to persist access token');
  }
}

/**
 * Retrieve the stored access token.
 * Returns null if not found or in an SSR context.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove the stored access token.
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Persist the refresh token.
 */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    console.warn('[RadLink] Failed to persist refresh token');
  }
}

/**
 * Retrieve the stored refresh token.
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove the stored refresh token.
 */
export function removeRefreshToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Clear all RadLink auth data from storage.
 * Call this on explicit logout or session expiry.
 */
export function clearAuthStorage(): void {
  removeToken();
  removeRefreshToken();
}

// ─── JWT decoding ─────────────────────────────

/**
 * Decode the payload of a JWT without verifying the signature.
 *
 * IMPORTANT: This is intentionally NOT a signature verification step.
 * Signature verification must happen on the server. This function is
 * used only to read claims (e.g., expiry, user info) in the browser.
 *
 * @param token - A JWT string in "header.payload.signature" format
 * @returns The decoded payload, or null if the token is malformed
 */
export function decodeToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad to a multiple of 4
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr) as TokenPayload;
    return payload;
  } catch {
    console.warn('[RadLink] Failed to decode JWT payload');
    return null;
  }
}

/**
 * Check whether a JWT has expired based on its `exp` claim.
 *
 * A 30-second clock-skew buffer is applied so tokens aren't
 * considered valid right up until the last second.
 *
 * @param token - A JWT string
 * @returns true if the token is expired (or undecipherable), false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') return true;

  const CLOCK_SKEW_SECONDS = 30;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp < nowSeconds + CLOCK_SKEW_SECONDS;
}

/**
 * Return the number of seconds until the token expires.
 * Returns 0 if the token is already expired or invalid.
 */
export function getTokenTtlSeconds(token: string): number {
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') return 0;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttl = payload.exp - nowSeconds;
  return Math.max(0, ttl);
}

// ─── Auth user helpers ────────────────────────

/**
 * Construct an AuthUser object from the stored access token.
 * Returns null if no token is stored, it is malformed, or it has expired.
 */
export function getAuthUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired(token)) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantName: payload.tenantName,
    tenantSubdomain: payload.tenantSubdomain,
  };
}

/**
 * Returns true if there is a valid (non-expired) access token in storage.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Returns the full name of the currently authenticated user,
 * or an empty string if not authenticated.
 */
export function getAuthUserFullName(): string {
  const user = getAuthUser();
  if (!user) return '';
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Returns the role of the currently authenticated user,
 * or null if not authenticated.
 */
export function getAuthUserRole(): string | null {
  const user = getAuthUser();
  return user?.role ?? null;
}

/**
 * Returns the tenantId of the currently authenticated user,
 * or null if not authenticated.
 */
export function getAuthTenantId(): string | null {
  const user = getAuthUser();
  return user?.tenantId ?? null;
}

// ─── Role guards ──────────────────────────────

type KnownRole = 'Admin' | 'Radiologist' | 'Technician' | 'Viewer';

const ROLE_HIERARCHY: Record<KnownRole, number> = {
  Admin: 4,
  Radiologist: 3,
  Technician: 2,
  Viewer: 1,
};

/**
 * Check whether the current user has at least the given role level.
 *
 * @example
 * hasRole('Radiologist') // true for Admin and Radiologist, false for Technician and Viewer
 */
export function hasRole(requiredRole: KnownRole): boolean {
  const role = getAuthUserRole() as KnownRole | null;
  if (!role) return false;

  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Check whether the current user has exactly the given role.
 */
export function hasExactRole(role: KnownRole): boolean {
  return getAuthUserRole() === role;
}
