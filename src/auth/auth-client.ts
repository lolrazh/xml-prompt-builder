import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV ? "http://localhost:8787" : "http://api.xml.soy.run",
  credentials: "include",
  session: {
    storeHeaders: true,
    cookieName: "better-auth.session",
    storage: "localStorage", // Use localStorage for cross-domain support
    fetchOnWindowFocus: true, // Refetch session when window gains focus
  },
})

export type AuthClient = typeof authClient