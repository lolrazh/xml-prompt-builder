import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run",
  credentials: "include",
  session: {
    storeHeaders: true,
    cookieName: "better-auth.session",
    storage: "localStorage", // Use localStorage for cross-domain support
    fetchOnWindowFocus: true, // Refetch session when window gains focus
  },
})

// Token management for cross-domain authentication
const TOKEN_STORAGE_KEY = "auth.access_token"
const TOKEN_EXPIRY_KEY = "auth.token_expiry"

export const tokenManager = {
  getToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
      
      if (!token || !expiry) return null
      
      // Check if token is expired
      if (Date.now() > parseInt(expiry)) {
        this.clearToken()
        return null
      }
      
      return token
    } catch {
      return null
    }
  },

  setToken(token: string, expiresIn: number): void {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000)
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    } catch {
      // Ignore storage errors
    }
  },

  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
    } catch {
      // Ignore storage errors
    }
  },

  async fetchToken(): Promise<string | null> {
    try {
      const baseURL = import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run"
      const response = await fetch(`${baseURL}/api/auth/token`, {
        method: 'POST',
        credentials: 'include', // Include cookies for session auth
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn('Failed to fetch access token:', response.status)
        return null
      }

      const data = await response.json()
      if (data.access_token && data.expires_in) {
        this.setToken(data.access_token, data.expires_in)
        return data.access_token
      }

      return null
    } catch (error) {
      console.warn('Error fetching access token:', error)
      return null
    }
  },

  async getOrFetchToken(): Promise<string | null> {
    let token = this.getToken()
    
    if (!token) {
      token = await this.fetchToken()
    }
    
    return token
  }
}

export type AuthClient = typeof authClient