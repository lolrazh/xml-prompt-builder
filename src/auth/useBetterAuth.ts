import { useEffect, useMemo, useRef } from 'react';
import { authClient, tokenManager } from './auth-client';
import { clearCachedUser, clearAllAuthStorage, loadCachedUser, saveCachedUser, type CachedUser } from './auth-cache';

export type DisplayUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function toCachedUser(betterAuthUser: any | null | undefined): CachedUser | null {
  if (!betterAuthUser) return null;
  return {
    id: betterAuthUser.id,
    email: betterAuthUser.email ?? null,
    firstName: betterAuthUser.name?.split(' ')[0] ?? null,
    lastName: betterAuthUser.name?.split(' ').slice(1).join(' ') ?? null,
    profilePictureUrl: betterAuthUser.image ?? null,
    createdAt: betterAuthUser.createdAt ? String(betterAuthUser.createdAt) : null,
    updatedAt: betterAuthUser.updatedAt ? String(betterAuthUser.updatedAt) : null,
  };
}

export function useBetterAuth() {
  const session = authClient.useSession()
  const cached = useMemo(() => loadCachedUser(), []);
  const hasSavedOnceRef = useRef(false);
  const origin = window.location.origin;
  
  // Debug logging
  useEffect(() => {
    console.log('Session state:', {
      isLoading: session.isPending,
      hasUser: !!session.data?.user,
      user: session.data?.user,
      error: session.error,
      cached: !!cached
    });
  }, [session.isPending, session.data?.user, session.error, cached]);

  // Persist authoritative user to cache once it becomes available
  useEffect(() => {
    if (session.data?.user) {
      saveCachedUser(toCachedUser(session.data.user));
      hasSavedOnceRef.current = true;
      
      // Proactively fetch access token for cross-domain auth
      if (!tokenManager.getToken()) {
        tokenManager.fetchToken().catch(console.warn);
      }
    } else if (!session.isPending && !session.data?.user) {
      // Completed loading and no user -> clear cache to avoid stale data
      if (cached) {
        clearCachedUser();
      }
      // Also clear tokens
      tokenManager.clearToken();
    }
  }, [session.data?.user, session.isPending, cached]);

  // Clean up cache when auth state changes
  useEffect(() => {
    if (!session.isPending && !session.data?.user && cached) {
      // If we're done loading and have no user but have cached data, clear it
      clearCachedUser();
    }
  }, [session.isPending, session.data?.user, cached]);

  const displayUser: DisplayUser | null = useMemo(() => {
    const user = session.data?.user;
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt ? user.createdAt.toString() : null,
        updatedAt: user.updatedAt ? user.updatedAt.toString() : null,
      };
    }
    return cached ?? null;
  }, [session.data?.user, cached]);

  const isHydratingFromCache = !session.data?.user && !!cached && session.isPending;

  // Wrap signOut to clear cache and tokens immediately for snappy UI
  const wrappedSignOut = async () => {
    try {
      clearCachedUser();
      tokenManager.clearToken();
    } catch {}
    await authClient.signOut();
  };

  // Sign in with social providers
  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: origin + "/dashboard",
    });
  };

  const signInWithGitHub = async () => {
    await authClient.signIn.social({
      provider: "github", 
      callbackURL: origin + "/dashboard",
    });
  };

  return {
    user: displayUser,
    isLoading: session.isPending,
    error: session.error,
    signOut: wrappedSignOut,
    signInWithGoogle,
    signInWithGitHub,
    isHydratingFromCache,
    refetch: session.refetch,
  } as const;
}

export default useBetterAuth;