import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV ? "http://localhost:8787" : "https://backend.soyrun.workers.dev",
  credentials: "include",
  session: {
    storeHeaders: true,
  },
})

export type AuthClient = typeof authClient