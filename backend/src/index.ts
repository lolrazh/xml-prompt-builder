import { Hono } from 'hono'
import { cors } from 'hono/cors'
import jwt from '@tsndr/cloudflare-worker-jwt'
import type { D1Database } from '@cloudflare/workers-types'

type JwtHeader = {
  alg?: string
  kid?: string
  typ?: string
}

type WorkOsJwtPayload = {
  sub: string
  iss?: string
  aud?: string | string[]
  email?: string
  exp: number
  nbf?: number
  iat?: number
}

type Jwk = {
  kty: string
  kid?: string
  use?: string
  alg?: string
  n?: string
  e?: string
  x5c?: string[]
}

export type Env = {
  DB: D1Database
  WORKOS_JWKS_URL: string
  WORKOS_AUDIENCE: string
  WORKOS_ISSUER: string
  WORKOS_ME_URL?: string
}

type Variables = {
  userId: string
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Configure CORS to allow requests from the frontend
app.use('*', cors({
  origin: ['https://xml.soy.run', 'http://localhost:8080'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true, // Allow cookies and credentials for WorkOS refresh tokens
}))

// Simple global JWKS cache (per-worker instance)
const globalScope = globalThis as unknown as {
  __JWKS_CACHE__?: { keys: Jwk[]; fetchedAt: number }
}

async function getJwks(jwksUrl: string): Promise<Jwk[]> {
  const now = Date.now()
  const cacheTtlMs = 10 * 60 * 1000 // 10 minutes
  const cached = globalScope.__JWKS_CACHE__
  if (cached && now - cached.fetchedAt < cacheTtlMs) {
    return cached.keys
  }
  const res = await fetch(jwksUrl)
  if (!res.ok) throw new Error('Failed to fetch JWKS')
  const data = (await res.json()) as { keys: Jwk[] }
  globalScope.__JWKS_CACHE__ = { keys: data.keys, fetchedAt: now }
  return data.keys
}

function audienceMatches(aud: string | string[] | undefined, expected: string | undefined): boolean {
  if (!expected || expected === 'any') return true
  // Allow undefined/null audience for WorkOS tokens that don't set aud claim
  if (!aud) return true
  const values = Array.isArray(aud) ? aud : [aud]
  return values.includes(expected) || values.includes('authkit')
}

// Auth middleware: verifies Bearer JWT, validates iss/aud, puts userId into context
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice('Bearer '.length)
  try {
    const decoded = jwt.decode(token) as { header: JwtHeader; payload: WorkOsJwtPayload } | undefined
    if (!decoded || !decoded.header) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const kid = decoded.header.kid
    const keys = await getJwks(c.env.WORKOS_JWKS_URL)
    const jwk = kid ? keys.find(k => k.kid === kid) : keys[0]
    if (!jwk) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (!jwk.kid || !jwk.n || !jwk.e) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const publicKey = {
      kty: 'RSA',
      kid: jwk.kid,
      n: jwk.n,
      e: jwk.e,
      alg: 'RS256',
    } as const satisfies JsonWebKey & { kid: string }

    const verified = await jwt.verify(token, publicKey as unknown as any, 'RS256' as any)
    if (verified) {
      const payload = (verified as any).payload as WorkOsJwtPayload
      const issuerOk = !c.env.WORKOS_ISSUER || c.env.WORKOS_ISSUER === 'any' || (payload.iss?.startsWith(c.env.WORKOS_ISSUER) ?? false)
      const audienceOk = audienceMatches(payload.aud, c.env.WORKOS_AUDIENCE)
      if (issuerOk && audienceOk && payload.sub) {
        c.set('userId', payload.sub)
        await next()
        return
      }
    }

    // Fallback: call WorkOS to resolve the current user from access token (supports opaque tokens)
    const meUrl = c.env.WORKOS_ME_URL || 'https://api.workos.com/user_management/users/me'
    const meResp = await fetch(meUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (meResp.ok) {
      const me = (await meResp.json()) as { id?: string }
      if (me?.id) {
        c.set('userId', me.id)
        await next()
        return
      }
    }
    return c.json({ error: 'Unauthorized' }, 401)
  } catch (_err) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
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
