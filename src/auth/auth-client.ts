import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run",
  credentials: "include",
  session: {
    storeHeaders: true,
    cookieName: "better-auth.session",
    storage: "localStorage", // Use localStorage for cross-domain support
    fetchOnWindowFocus: true, // Refetch session when window gains focus
    // Enhanced cross-domain settings
    syncAcrossTabs: false, // Disable to avoid conflicts in cross-domain scenarios
    disableDefaultFallback: false, // Keep fallback mechanisms enabled
  },
  // Enhanced fetch configuration for cross-domain
  fetch: {
    retry: 2, // Retry failed requests
    timeout: 10000, // 10 second timeout
  },
  // Additional headers for cross-domain requests
  headers: {
    'Content-Type': 'application/json',
  },
})

export type AuthClient = typeof authClient