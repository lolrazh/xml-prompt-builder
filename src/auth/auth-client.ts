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
  credentials: "include",
  session: {
    storeHeaders: true,
    cookieName: "better-auth.session",
    storage: "localStorage", // Use localStorage for cross-domain support
    fetchOnWindowFocus: true, // Refetch session when window gains focus
  },
})

export type AuthClient = typeof authClient