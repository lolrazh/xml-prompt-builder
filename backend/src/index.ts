import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from '@cloudflare/workers-types'
import { createAuth, type Auth } from './auth'
import { sign, verify } from 'hono/jwt'

export type Env = {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  JWT_SECRET?: string
}

type Variables = {
  userId: string
  user: any
  session: any
  auth: Auth
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Configure CORS to allow requests from the frontend
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = ['https://xml.soy.run', 'https://xmb.soy.run', 'http://localhost:8080', 'https://xml-prompt-builder-import-patch.vercel.app', "https://xmlprompt.dev/"]
    return allowedOrigins.includes(origin || '') ? origin : null
  },
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}))

// Initialize Better Auth with environment variables
app.use('*', async (c, next) => {
  if (!c.get('auth')) {
    c.set('auth', createAuth(c.env))
  }
  await next()
})

// Production-ready request logging (less verbose)
app.use('*', async (c, next) => {
  if (c.req.path.includes('/api/auth/')) {
    console.log('Auth request:', c.req.method, c.req.path)
  }
  await next()
})

// Cross-domain OAuth initiation endpoint
app.post('/api/auth/oauth/:provider', async (c) => {
  const provider = c.req.param('provider')
  const { redirectTo } = await c.req.json().catch(() => ({}))
  
  if (!['google', 'github'].includes(provider)) {
    return c.json({ error: 'Invalid provider' }, 400)
  }
  
  // Store the frontend origin for post-auth redirect
  const frontendOrigin = redirectTo || c.req.header('origin') || 'https://xml-prompt-builder-import-patch.vercel.app'
  
  // Create OAuth URL with state containing the frontend origin
  const auth = c.get('auth')
  const state = btoa(JSON.stringify({ 
    origin: frontendOrigin, 
    timestamp: Date.now() 
  }))
  
  const authUrl = provider === 'google' 
    ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=https://xmb.soy.run/api/auth/callback/google&response_type=code&scope=email+profile&state=${state}`
    : `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}&redirect_uri=https://xmb.soy.run/api/auth/callback/github&scope=user:email&state=${state}`
  
  return c.json({ authUrl })
})

// OAuth success page for popup-based authentication
app.get('/api/auth/oauth-success', async (c) => {
  try {
    const origin = c.req.query('origin')
    const state = c.req.query('state')
    const error = c.req.query('error')
    
    console.log('OAuth success page called:', { origin, state, error })
    
    if (!origin) {
      return c.html(`
        <script>
          window.opener?.postMessage({ success: false, error: 'Missing origin parameter' }, '*');
          window.close();
        </script>
      `)
    }
    
    // Handle OAuth errors
    if (error) {
      console.warn('OAuth error in success page:', error)
      return c.html(`
        <script>
          window.opener?.postMessage({ 
            success: false, 
            error: 'OAuth failed: ${error}' 
          }, '${origin}');
          window.close();
        </script>
        <div>Authentication failed: ${error}</div>
      `)
    }
    
    // Get current session (should be established after OAuth callback)
    const auth = c.get('auth')
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    })
    
    console.log('Session in OAuth success:', { hasSession: !!session, userId: session?.user?.id })
    
    if (session?.user) {
      // Generate access token
      const jwtSecret = c.env.JWT_SECRET
      const accessToken = await sign(
        {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        },
        jwtSecret as string
      )
      
      console.log('Generated access token, posting message to parent')
      
      // Safely serialize user data
      const userData = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        image: session.user.image || null
      }
      
      // Send token to parent window via postMessage
      return c.html(`
        <script>
          try {
            const authData = {
              success: true,
              access_token: "${accessToken}",
              expires_in: ${7 * 24 * 60 * 60},
              user: ${JSON.stringify(userData)}
            };
            
            console.log('Posting auth success to parent:', authData);
            window.opener?.postMessage(authData, '${origin}');
          } catch (err) {
            console.error('Error posting message:', err);
            window.opener?.postMessage({ 
              success: false, 
              error: 'Failed to process authentication data' 
            }, '${origin}');
          }
          setTimeout(() => window.close(), 1000);
        </script>
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h3>✅ Authentication successful!</h3>
          <p>This window will close automatically...</p>
        </div>
      `)
    } else {
      console.warn('No session found in OAuth success')
      return c.html(`
        <script>
          window.opener?.postMessage({ 
            success: false, 
            error: 'No session found' 
          }, '${origin}');
          setTimeout(() => window.close(), 1000);
        </script>
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h3>❌ Authentication failed</h3>
          <p>No session found. Please try again.</p>
        </div>
      `)
    }
  } catch (error) {
    console.error('OAuth success page error:', error)
    const origin = c.req.query('origin') || '*'
    return c.html(`
      <script>
        window.opener?.postMessage({ 
          success: false, 
          error: 'Authentication failed' 
        }, '${origin}');
        setTimeout(() => window.close(), 1000);
      </script>
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h3>❌ Authentication error</h3>
        <p>An unexpected error occurred. Please try again.</p>
      </div>
    `)
  }
})

// Exchange temporary token for permanent access token - MUST be before wildcard handler
app.post('/api/auth/exchange-token', async (c) => {
  try {
    const { tempToken } = await c.req.json()
    
    if (!tempToken) {
      return c.json({ error: 'Temporary token required' }, 400)
    }
    
    const jwtSecret = c.env.JWT_SECRET
    const payload = await verify(tempToken, jwtSecret as string) as any
    
    if (!payload.temp || !payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Invalid or expired temporary token' }, 400)
    }
    
    // Generate permanent access token
    const accessToken = await sign(
      {
        userId: payload.userId,
        email: payload.email,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      },
      jwtSecret as string
    )
    
    return c.json({
      access_token: accessToken,
      expires_in: 7 * 24 * 60 * 60,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name || payload.email,
        image: payload.image || null
      }
    })
    
  } catch (error) {
    console.error('Token exchange error:', error)
    return c.json({ error: 'Token exchange failed' }, 500)
  }
})

// Generate access token for cross-domain authentication (existing session) - MUST be before wildcard handler
app.post('/api/auth/token', async (c) => {
  const auth = c.get('auth')
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const jwtSecret = c.env.JWT_SECRET
    const token = await sign(
      {
        userId: session.user.id,
        email: session.user.email,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      },
      jwtSecret as string
    )

    return c.json({ 
      access_token: token, 
      expires_in: 7 * 24 * 60 * 60,
      user: session.user 
    })
  } catch (error) {
    console.error('Token generation error:', error)
    return c.json({ error: 'Failed to generate token' }, 500)
  }
})

// Better Auth API routes - handle all auth endpoints
app.all('/api/auth/*', async (c) => {
  const auth = c.get('auth')
  
  if (!auth) {
    console.error('Auth object not found in context')
    return c.json({ error: 'Auth not initialized' }, 500)
  }
  
  try {
    const response = await auth.handler(c.req.raw)
    
    // Handle OAuth callbacks - check for cross-domain redirect to popup success page
    if (c.req.path.includes('/callback/') && response.status === 302) {
      const requestUrl = new URL(c.req.url)
      const state = requestUrl.searchParams.get('state')
      const error = requestUrl.searchParams.get('error')
      
      console.log('OAuth callback detected:', { 
        path: c.req.path, 
        status: response.status, 
        hasState: !!state,
        error,
        location: response.headers.get('Location')
      })
      
      // If we have a state parameter, check if this is cross-domain
      if (state) {
        try {
          const { origin } = JSON.parse(atob(state))
          
          // Check if this is a cross-domain scenario (popup-based auth)
          // Any domain not on the backend domain should use popup flow
          if (!origin.includes('xmb.soy.run')) {
            console.log('Cross-domain OAuth callback for origin:', origin)
            
            // If there's an OAuth error, redirect to error page
            if (error) {
              console.warn('OAuth error detected:', error)
              const errorUrl = new URL('/api/auth/oauth-success', 'https://xmb.soy.run')
              errorUrl.searchParams.set('origin', origin)
              errorUrl.searchParams.set('error', error)
              return c.redirect(errorUrl.toString())
            }
            
            // For successful auth, redirect to success page instead of default redirect
            const location = response.headers.get('Location')
            console.log('Redirecting to popup success page instead of:', location)
            
            const successUrl = new URL('/api/auth/oauth-success', 'https://xmb.soy.run')
            successUrl.searchParams.set('origin', origin)
            successUrl.searchParams.set('state', state)
            
            return c.redirect(successUrl.toString())
          }
        } catch (error) {
          console.error('OAuth callback state parsing error:', error)
        }
      }
    }
    
    // Debug session data for get-session calls
    if (c.req.path.includes('get-session')) {
      const responseText = await response.clone().text()
      console.log('Session response:', responseText)
      const headers: Record<string, string> = {}
      c.req.raw.headers.forEach((value, key) => { headers[key] = value })
      console.log('Request headers:', headers)
    }
    
    return response
  } catch (error: any) {
    console.error('Auth handler error:', error?.message || String(error))
    return c.json({ error: 'Auth handler failed' }, 500)
  }
})




// Auth middleware for protected routes
app.use('/api/prompts/*', async (c, next) => {
  const auth = c.get('auth')
  
  // Try session authentication first (cookies)
  let session = await auth.api.getSession({
    headers: c.req.raw.headers
  })
  
  // If no session from cookies, try Authorization header with JWT
  if (!session) {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const jwtSecret = c.env.JWT_SECRET
        
        // Verify JWT token
        const payload = await verify(token, jwtSecret as string) as any
        
        if (payload.userId && payload.exp && payload.exp > Math.floor(Date.now() / 1000)) {
          // Create a mock session-like object for compatibility
          session = {
            user: {
              id: String(payload.userId),
              email: String(payload.email || ''),
              emailVerified: false,
              name: String(payload.email || ''),
              createdAt: new Date(),
              updatedAt: new Date()
            },
            session: {
              id: 'jwt-session',
              userId: String(payload.userId),
              expiresAt: new Date(payload.exp * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
              token: token
            }
          }
        }
      } catch (error) {
        console.log('JWT verification failed:', error)
      }
    }
  }

  if (!session) {
    const headers: Record<string, string> = {}
    c.req.raw.headers.forEach((value, key) => { headers[key] = value })
    console.log('No valid session found, headers:', headers)
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('userId', session.user.id)
  c.set('user', session.user)
  c.set('session', session.session)
  await next()
})

app.get('/', (c) => {
  return c.text('OK')
})

// Health check endpoint for debugging
app.get('/api/health', (c) => {
  const origin = c.req.header('origin')
  return c.json({ 
    status: 'ok', 
    origin, 
    cors: 'enabled',
    timestamp: new Date().toISOString()
  })
})

// Debug auth status endpoint
app.get('/api/auth/debug', async (c) => {
  const auth = c.get('auth')
  const origin = c.req.header('origin')
  
  // Get session from cookies
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })
  
  // Check JWT token if no session
  let jwtPayload = null
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ') && !session) {
    try {
      const token = authHeader.substring(7)
      const jwtSecret = c.env.JWT_SECRET
      jwtPayload = await verify(token, jwtSecret as string)
    } catch (error) {
      jwtPayload = { error: error.message }
    }
  }
  
  return c.json({
    origin,
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    hasAuthHeader: !!authHeader,
    jwtPayload,
    cookies: c.req.header('cookie'),
    timestamp: new Date().toISOString()
  })
})

// List current user's prompts
app.get('/api/prompts', async (c) => {
  const userId = c.get('userId')
  const url = new URL(c.req.url)
  const limitParam = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = Math.max(1, Math.min(100, Number(limitParam) || 50))

  try {
    let sql =
      'SELECT id, name, content, created_at, updated_at, strftime("%s", updated_at) as updated_epoch FROM prompts WHERE user_id = ?'
    const binds: unknown[] = [userId]

    if (cursor) {
      // cursor format: base64('epoch|id')
      try {
        const decoded = atob(cursor)
        const [epochStr, lastId] = decoded.split('|')
        const epoch = Number(epochStr)
        if (Number.isFinite(epoch) && lastId) {
          sql +=
            ' AND (strftime("%s", updated_at) < ? OR (strftime("%s", updated_at) = ? AND id < ?))'
          binds.push(epoch, epoch, lastId)
        }
      } catch {}
    }

    sql += ' ORDER BY updated_at DESC, id DESC LIMIT ?'
    // pull one extra row to compute nextCursor
    binds.push(limit + 1)

    const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
    const items = Array.isArray(results) ? results : []
    let nextCursor: string | undefined
    let data = items
    if (items.length > limit) {
      const extra = items.pop() as any
      data = items
      const nextEpoch = String(extra.updated_epoch ?? '')
      const nextId = String(extra.id)
      if (nextEpoch && nextId) {
        nextCursor = btoa(`${nextEpoch}|${nextId}`)
      }
    }

    return c.json({ prompts: data.map(({ updated_epoch, ...row }) => row), nextCursor })
  } catch {
    return c.json({ error: 'Failed to fetch prompts' }, 500)
  }
})

// Create a new prompt for current user
app.post('/api/prompts', async (c) => {
  const userId = c.get('userId')
  const body = (await c.req.json().catch(() => ({}))) as Partial<{ name: string; content: string }>
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const content = typeof body.content === 'string' ? body.content : ''
  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }
  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare(
      'INSERT INTO prompts (id, user_id, name, content) VALUES (?, ?, ?, ?)'
    ).bind(id, userId, name, content).run()
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, content, created_at, updated_at FROM prompts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).all()
    const prompt = results?.[0]
    return c.json({ prompt }, 201)
  } catch {
    return c.json({ error: 'Failed to create prompt' }, 500)
  }
})

// Fetch a single prompt owned by the user
app.get('/api/prompts/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, content, created_at, updated_at FROM prompts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).all()
    const prompt = results?.[0]
    if (!prompt) return c.json({ error: 'Not found' }, 404)
    return c.json({ prompt })
  } catch {
    return c.json({ error: 'Failed to fetch prompt' }, 500)
  }
})

// Update a prompt (name/content); protected by user ownership
app.patch('/api/prompts/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as Partial<{ name: string; content: string }>
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const content = typeof body.content === 'string' ? body.content : undefined
  if (!name && typeof content !== 'string') {
    return c.json({ error: 'Nothing to update' }, 400)
  }
  try {
    if (name != null && content != null) {
      const r = await c.env.DB.prepare(
        'UPDATE prompts SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      ).bind(name, content, id, userId).run()
      if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    } else if (name != null) {
      const r = await c.env.DB.prepare(
        'UPDATE prompts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      ).bind(name, id, userId).run()
      if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    } else if (content != null) {
      const r = await c.env.DB.prepare(
        'UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      ).bind(content, id, userId).run()
      if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    }
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, content, created_at, updated_at FROM prompts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).all()
    const prompt = results?.[0]
    return c.json({ prompt })
  } catch {
    return c.json({ error: 'Failed to update prompt' }, 500)
  }
})

// Delete prompt
app.delete('/api/prompts/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  try {
    const r = await c.env.DB.prepare('DELETE FROM prompts WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run()
    if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    return c.json({ deleted: true })
  } catch {
    return c.json({ error: 'Failed to delete prompt' }, 500)
  }
})

export default app