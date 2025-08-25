import { createAuthClient } from "better-auth/react"

// Dynamic base URL configuration for cross-domain support
function getAuthBaseURL(): string {
  // Check for explicit configuration first
  if (import.meta.env.VITE_AUTH_BASE_URL) {
    return import.meta.env.VITE_AUTH_BASE_URL;
  }
  
  // Development mode
  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }
  
  // Production fallback
  return "https://xmb.soy.run";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  credentials: "include", // Still need for OAuth callbacks
  session: {
    storage: "localStorage",
    fetchOnWindowFocus: true,
    cookieName: "better-auth.session",
    storeHeaders: true,
  },
})

// JWT token management
const JWT_TOKEN_KEY = 'xml-prompt-builder-jwt';

export function getJWTToken(): string | null {
  try {
    return localStorage.getItem(JWT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setJWTToken(token: string): void {
  try {
    localStorage.setItem(JWT_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearJWTToken(): void {
  try {
    localStorage.removeItem(JWT_TOKEN_KEY);
  } catch {
    // ignore
  }
}

// Enhanced fetch that includes JWT token
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getJWTToken();
  
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

export type AuthClient = typeof authClient