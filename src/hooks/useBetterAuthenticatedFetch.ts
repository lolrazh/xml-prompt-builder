import { useCallback } from 'react';
import { authClient } from '../auth/auth-client';

export function useBetterAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for Better Auth sessions
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If we get a 401, the session might be invalid
      if (response.status === 401) {
        console.warn('API returned 401, session may be invalid. Redirecting to sign in.');
        // Force refresh session and redirect if still not authenticated
        await authClient.useSession.refetch?.();
        throw new Error('Authentication required');
      }

      return response;
    } catch (error: any) {
      // If authentication fails, the user needs to sign in again
      if (error?.message?.includes('Authentication required')) {
        // Redirect to login page or trigger sign in flow
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      throw error;
    }
  }, []);

  return authenticatedFetch;
}