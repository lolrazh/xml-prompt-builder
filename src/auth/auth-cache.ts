// Simple, non-authoritative cache of minimal user info for instant UI rendering
// Never rely on this cache for authorization; it is purely cosmetic.

export type CachedUser = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const AUTH_CACHE_KEY = "auth.cachedUser.v1";

export function loadCachedUser(): CachedUser | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUser;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedUser(user: CachedUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }
    const minimal: CachedUser = {
      id: user.id,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      profilePictureUrl: user.profilePictureUrl ?? null,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(minimal));
  } catch {
    // ignore
  }
}

export function clearCachedUser(): void {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // ignore
  }
}


