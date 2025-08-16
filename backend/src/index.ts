import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from '@cloudflare/workers-types'
import { createAuth, type Auth } from './auth'

export type Env = {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
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
    const allowedOrigins = ['https://xml.soy.run', 'https://xmb.soy.run', 'http://localhost:8080']
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

// Better Auth API routes - handle all auth endpoints
app.all('/api/auth/*', async (c) => {
  const auth = c.get('auth')
  
  if (!auth) {
    console.error('Auth object not found in context')
    return c.json({ error: 'Auth not initialized' }, 500)
  }
  
  try {
    const response = await auth.handler(c.req.raw)
    
    // Debug session data for get-session calls
    if (c.req.path.includes('get-session')) {
      const responseText = await response.clone().text()
      console.log('Session response:', responseText)
      console.log('Request headers:', Object.fromEntries(c.req.raw.headers.entries()))
    }
    
    return response
  } catch (error) {
    console.error('Auth handler error:', error.message)
    return c.json({ error: 'Auth handler failed' }, 500)
  }
})

// Auth middleware for protected routes
app.use('/api/prompts/*', async (c, next) => {
  const auth = c.get('auth')
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })

  if (!session) {
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