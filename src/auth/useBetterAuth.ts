import { useEffect, useMemo, useRef, useState } from 'react';
import { authClient, getJWTToken, setJWTToken, clearJWTToken, authenticatedFetch } from './auth-client';
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
  const [jwtUser, setJwtUser] = useState<any>(null);
  const [isJwtLoading, setIsJwtLoading] = useState(true);
  
  // Try to get JWT token and verify it
  useEffect(() => {
    const verifyJWT = async () => {
      const token = getJWTToken();
      if (!token) {
        setIsJwtLoading(false);
        return;
      }
      
      try {
        const baseURL = import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run";
        const response = await authenticatedFetch(`${baseURL}/api/auth/verify-jwt`);
        if (response.ok) {
          const data = await response.json();
          setJwtUser(data.user);
        } else {
          // Invalid token, clear it
          clearJWTToken();
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
        clearJWTToken();
      } finally {
        setIsJwtLoading(false);
      }
    };
    
    verifyJWT();
  }, []);
  
  // Get JWT token after successful OAuth login
  useEffect(() => {
    const getJWTAfterLogin = async () => {
      if (session.data?.user && !getJWTToken()) {
        try {
          const baseURL = import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run";
          const response = await fetch(`${baseURL}/api/auth/jwt-session`, {
            method: 'POST',
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            setJWTToken(data.token);
            setJwtUser(data.user);
          }
        } catch (error) {
          console.error('Failed to get JWT token:', error);
        }
      }
    };
    
    getJWTAfterLogin();
  }, [session.data?.user]);
  
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
    } else if (!session.isPending && !session.data?.user) {
      // Completed loading and no user -> clear cache to avoid stale data
      if (cached) {
        clearCachedUser();
      }
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
    // Prefer JWT user for cross-domain compatibility
    if (jwtUser) {
      return {
        id: jwtUser.id,
        email: jwtUser.email,
        name: jwtUser.name,
        image: jwtUser.image,
        emailVerified: jwtUser.emailVerified,
        createdAt: jwtUser.createdAt ? jwtUser.createdAt.toString() : null,
        updatedAt: jwtUser.updatedAt ? jwtUser.updatedAt.toString() : null,
      };
    }
    
    // Fall back to session user
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
  }, [jwtUser, session.data?.user, cached]);

  const isHydratingFromCache = !jwtUser && !session.data?.user && !!cached && (session.isPending || isJwtLoading);
  const isLoading = session.isPending || isJwtLoading;

  // Wrap signOut to clear all auth data
  const wrappedSignOut = async () => {
    try {
      clearCachedUser();
      clearJWTToken();
      setJwtUser(null);
    } catch {}
    await authClient.signOut();
  };

  // Sign in with social providers - dynamic callback URLs
  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${origin}/dashboard`,
    });
  };

  const signInWithGitHub = async () => {
    await authClient.signIn.social({
      provider: "github", 
      callbackURL: `${origin}/dashboard`,
    });
  };

  return {
    user: displayUser,
    isLoading,
    error: session.error,
    signOut: wrappedSignOut,
    signInWithGoogle,
    signInWithGitHub,
    isHydratingFromCache,
    refetch: session.refetch,
    // Expose JWT token for API calls
    getToken: getJWTToken,
  } as const;
}

export default useBetterAuth;