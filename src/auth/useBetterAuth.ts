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
  const hasProcessedTokenRef = useRef(false);
  const origin = window.location.origin;
  
  // Handle temporary token exchange on page load (for cross-domain auth)
  useEffect(() => {
    if (hasProcessedTokenRef.current) return;
    
    const handleTemporaryToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tempToken = urlParams.get('token');
      
      if (tempToken) {
        hasProcessedTokenRef.current = true;
        try {
          const result = await tokenManager.exchangeTemporaryToken(tempToken);
          if (result) {
            // Clear the token from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('token');
            window.history.replaceState({}, document.title, newUrl.toString());
            
            // Store user data from token exchange
            if (typeof result === 'object' && result.user) {
              const cachedUser: CachedUser = {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.name?.split(' ')[0] || null,
                lastName: result.user.name?.split(' ').slice(1).join(' ') || null,
                profilePictureUrl: result.user.image || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              saveCachedUser(cachedUser);
            }
            
            // Force session refresh to pick up the new authentication state
            session.refetch();
          }
        } catch (error) {
          console.warn('Failed to exchange temporary token:', error);
        }
      }
    };
    
    handleTemporaryToken();
  }, []); // Only run once on mount
  
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

  // Sign in with social providers - use cross-domain flow for external domains
  const signInWithGoogle = async () => {
    // Check if we're on the same domain as the auth backend
    const isBackendDomain = import.meta.env.DEV 
      ? origin.includes('localhost:8080') || origin.includes('localhost:8787')
      : origin.includes('xmb.soy.run');
    
    if (isBackendDomain) {
      // Same domain - use normal better-auth flow
      await authClient.signIn.social({
        provider: "google",
        callbackURL: origin + "/dashboard",
      });
    } else {
      // Cross-domain - use popup-based OAuth flow
      try {
        const result = await tokenManager.initiateCrossDomainAuth('google');
        if (result.success && result.user) {
          // Store user data in cache for immediate UI update
          const cachedUser: CachedUser = {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.name?.split(' ')[0] || null,
            lastName: result.user.name?.split(' ').slice(1).join(' ') || null,
            profilePictureUrl: result.user.image || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveCachedUser(cachedUser);
          
          // Force session refresh
          session.refetch();
        } else if (result.error) {
          console.error('OAuth failed:', result.error);
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Google sign-in failed:', error);
        throw error;
      }
    }
  };

  const signInWithGitHub = async () => {
    // Check if we're on the same domain as the auth backend
    const isBackendDomain = import.meta.env.DEV 
      ? origin.includes('localhost:8080') || origin.includes('localhost:8787')
      : origin.includes('xmb.soy.run');
    
    if (isBackendDomain) {
      // Same domain - use normal better-auth flow
      await authClient.signIn.social({
        provider: "github", 
        callbackURL: origin + "/dashboard",
      });
    } else {
      // Cross-domain - use popup-based OAuth flow
      try {
        const result = await tokenManager.initiateCrossDomainAuth('github');
        if (result.success && result.user) {
          // Store user data in cache for immediate UI update
          const cachedUser: CachedUser = {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.name?.split(' ')[0] || null,
            lastName: result.user.name?.split(' ').slice(1).join(' ') || null,
            profilePictureUrl: result.user.image || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveCachedUser(cachedUser);
          
          // Force session refresh
          session.refetch();
        } else if (result.error) {
          console.error('OAuth failed:', result.error);
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('GitHub sign-in failed:', error);
        throw error;
      }
    }
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