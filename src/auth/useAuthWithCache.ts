import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { clearCachedUser, loadCachedUser, saveCachedUser, type CachedUser } from './auth-cache';

export type DisplayUser = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function toCachedUser(workosUser: any | null | undefined): CachedUser | null {
  if (!workosUser) return null;
  return {
    id: workosUser.id,
    email: workosUser.email ?? null,
    firstName: workosUser.firstName ?? null,
    lastName: workosUser.lastName ?? null,
    profilePictureUrl: workosUser.profilePictureUrl ?? null,
    // Normalize to ISO strings if Date objects are provided
    createdAt: workosUser.createdAt ? String(workosUser.createdAt) : null,
    updatedAt: workosUser.updatedAt ? String(workosUser.updatedAt) : null,
  };
}

export function useAuthWithCache() {
  const auth = useAuth();
  const cached = useMemo(() => loadCachedUser(), []);
  const hasSavedOnceRef = useRef(false);

  // Persist authoritative user to cache once it becomes available
  useEffect(() => {
    if (auth.user) {
      saveCachedUser(toCachedUser(auth.user));
      hasSavedOnceRef.current = true;
    } else if (!auth.isLoading && !auth.user && hasSavedOnceRef.current) {
      // Completed loading and no user but we had a user before -> likely refresh token expired
      // Clear cache to avoid confusion
      clearCachedUser();
    }
  }, [auth.user, auth.isLoading]);

  const displayUser: DisplayUser | null = useMemo(() => {
    return (auth.user as any) ?? cached ?? null;
  }, [auth.user, cached]);

  const isHydratingFromCache = !auth.user && !!cached && auth.isLoading;

  // Wrap signOut to clear cache immediately for snappy UI
  const wrappedSignOut = async () => {
    try {
      clearCachedUser();
    } catch {}
    await auth.signOut();
  };

  // Pass-through signIn; cache will be filled by effect once user available
  const wrappedSignIn = async () => {
    await auth.signIn();
  };

  return {
    ...auth,
    user: displayUser as any,
    signIn: wrappedSignIn,
    signOut: wrappedSignOut,
    isHydratingFromCache,
  } as const;
}

export default useAuthWithCache;


