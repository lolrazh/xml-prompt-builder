import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run",
  credentials: "include",
  fetchOptions: {
    credentials: "include", // Always include credentials for session cookies
    mode: "cors", // Enable CORS for cross-domain requests
  },
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
  },

  async exchangeTemporaryToken(tempToken: string): Promise<{ access_token: string; user?: any } | null> {
    try {
      const baseURL = import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run"
      const response = await fetch(`${baseURL}/api/auth/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tempToken })
      })

      if (!response.ok) {
        console.warn('Failed to exchange temporary token:', response.status)
        return null
      }

      const data = await response.json()
      if (data.access_token && data.expires_in) {
        this.setToken(data.access_token, data.expires_in)
        return {
          access_token: data.access_token,
          user: data.user
        }
      }

      return null
    } catch (error) {
      console.warn('Error exchanging temporary token:', error)
      return null
    }
  },

  async initiateCrossDomainAuth(provider: 'google' | 'github'): Promise<{ success: boolean; access_token?: string; user?: any; error?: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const baseURL = import.meta.env.DEV ? "http://localhost:8787" : "https://xmb.soy.run"
        const response = await fetch(`${baseURL}/api/auth/oauth/${provider}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            redirectTo: window.location.origin
          })
        })

        if (!response.ok) {
          throw new Error('Failed to initiate OAuth')
        }

        const data = await response.json()
        if (!data.authUrl) {
          throw new Error('No auth URL received')
        }

        // Open OAuth in popup
        const popup = window.open(
          data.authUrl,
          'oauth_popup',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          throw new Error('Failed to open popup - please allow popups for this site')
        }

        // Listen for messages from popup
        const handleMessage = (event: MessageEvent) => {
          // Verify origin - allow messages from the auth backend or current domain
          const allowedOrigins = [window.location.origin, 'https://xmb.soy.run', 'http://localhost:8787']
          if (!allowedOrigins.some(origin => event.origin === origin || event.origin.includes('xmb.soy.run'))) {
            console.warn('Rejecting message from unauthorized origin:', event.origin)
            return
          }

          console.log('Received message from OAuth popup:', event.data)

          if (event.data.success && event.data.access_token) {
            // Store the token
            this.setToken(event.data.access_token, event.data.expires_in)
            
            // Clean up
            window.removeEventListener('message', handleMessage)
            popup.close()
            
            resolve({
              success: true,
              access_token: event.data.access_token,
              user: event.data.user
            })
          } else if (event.data.error) {
            // Clean up
            window.removeEventListener('message', handleMessage)
            popup.close()
            
            resolve({
              success: false,
              error: event.data.error
            })
          }
        }

        window.addEventListener('message', handleMessage)

        // Handle popup closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            resolve({
              success: false,
              error: 'Authentication cancelled'
            })
          }
        }, 1000)

      } catch (error) {
        console.error('Error initiating cross-domain auth:', error)
        reject(error)
      }
    })
  }
}

export type AuthClient = typeof authClient