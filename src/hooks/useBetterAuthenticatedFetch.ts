import { useCallback } from 'react';
import { authClient, tokenManager } from '../auth/auth-client';

export function useBetterAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // Try to get or fetch an access token for cross-domain auth
      const token = await tokenManager.getOrFetchToken();
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      } as Record<string, string>;

      // Add Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for same-domain sessions
        headers,
      });

      // If we get a 401, try to refresh the token once
      if (response.status === 401 && token) {
        console.warn('API returned 401, attempting token refresh...');
        tokenManager.clearToken();
        
        // Try to fetch a new token
        const newToken = await tokenManager.fetchToken();
        
        if (newToken) {
          // Retry the request with the new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            credentials: 'include',
            headers,
          });
          
          if (retryResponse.ok) {
            return retryResponse;
          }
        }
        
        // If token refresh fails, redirect to login
        console.warn('Token refresh failed, redirecting to sign in.');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      if (response.status === 401) {
        console.warn('API returned 401, session may be invalid. Redirecting to sign in.');
        window.location.href = '/login';
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