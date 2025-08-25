import { useCallback } from 'react';
import { authClient, getJWTToken } from '../auth/auth-client';

export function useBetterAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const headers = new Headers(options.headers);
      
      // Set default Content-Type
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      
      // Add JWT token for cross-domain support
      const jwtToken = getJWTToken();
      if (jwtToken) {
        headers.set('Authorization', `Bearer ${jwtToken}`);
      }
      
      const response = await fetch(url, {
        ...options,
        credentials: jwtToken ? 'omit' : 'include', // Use JWT or fallback to cookies
        headers,
      });

      // If we get a 401, the session might be invalid
      if (response.status === 401) {
        console.warn('API returned 401, session may be invalid. Redirecting to sign in.');
        
        // Clear invalid JWT token
        if (jwtToken) {
          localStorage.removeItem('xml-prompt-builder-jwt');
        }
        
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