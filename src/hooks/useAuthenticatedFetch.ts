import { useAuth } from '@workos-inc/authkit-react';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
  const { getAccessToken, signIn } = useAuth();

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // Get access token, which will automatically refresh if needed
      const token = await getAccessToken();
      
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for WorkOS refresh tokens
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If we get a 401, the token might be invalid despite refresh attempts
      if (response.status === 401) {
        console.warn('API returned 401, token may be invalid. Redirecting to sign in.');
        signIn();
        throw new Error('Authentication required');
      }

      return response;
    } catch (error: any) {
      // If getAccessToken fails, it means refresh failed
      if (error?.message?.includes('refresh') || error?.name === 'LoginRequiredError') {
        console.warn('Token refresh failed, redirecting to sign in');
        signIn();
        throw new Error('Authentication required');
      }
      throw error;
    }
  }, [getAccessToken, signIn]);

  return authenticatedFetch;
}