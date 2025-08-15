import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { clearCachedUser, clearAllAuthStorage, loadCachedUser, saveCachedUser, type CachedUser } from './auth-cache';

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
    } else if (!auth.isLoading && !auth.user) {
      // Completed loading and no user -> clear cache to avoid stale data
      if (cached) {
        clearCachedUser();
      }
    }
  }, [auth.user, auth.isLoading, cached]);

  // Handle WorkOS AuthKit errors by clearing all auth-related storage
  useEffect(() => {
    const handleAuthError = (event: any) => {
      if (event.data?.type === 'workos-error' || 
          (event.data?.error && event.data.error_description?.includes('refresh token'))) {
        console.warn('WorkOS auth error detected, clearing auth storage');
        clearAllAuthStorage();
      }
    };

    // Also listen for console errors that might indicate auth issues
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Missing refresh token') || 
          message.includes('invalid_request') ||
          message.includes('refresh token')) {
        console.warn('Auth error detected in console, clearing auth storage');
        clearAllAuthStorage();
        // Force page reload to restart auth flow cleanly
        setTimeout(() => window.location.reload(), 100);
      }
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('message', handleAuthError);
    
    return () => {
      window.removeEventListener('message', handleAuthError);
      console.error = originalConsoleError;
    };
  }, []);

  const displayUser: DisplayUser | null = useMemo(() => {
    return (auth.user as any) ?? cached ?? null;
  }, [auth.user, cached]);

  const isHydratingFromCache = !auth.user && !!cached && auth.isLoading;

  // Wrap signOut to clear cache immediately for snappy UI
  const wrappedSignOut = async () => {
    try {
      clearAllAuthStorage();
    } catch {}
    await auth.signOut();
  };

  // Pass-through signIn; cache will be filled by effect once user available
  const wrappedSignIn = async () => {
    try {
      await auth.signIn();
    } catch (error: any) {
      // Handle refresh token errors during sign in
      if (error?.message?.includes('refresh token') || 
          error?.error_description?.includes('refresh token')) {
        console.warn('Refresh token error during sign in, clearing storage and retrying');
        clearAllAuthStorage();
        // Force page reload to restart auth flow
        window.location.reload();
      }
      throw error;
    }
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


