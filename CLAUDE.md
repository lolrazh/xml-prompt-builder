# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XML Prompt Builder is a full-stack application for creating structured XML prompts for AI systems. It consists of:

- **Frontend**: React + TypeScript SPA with visual XML building interface
- **Backend**: Hono-based Cloudflare Worker with D1 database for prompt persistence
- **Authentication**: WorkOS AuthKit integration for user management

## Development Commands

### Frontend (Root Directory)
- `npm run dev` - Start Vite development server on port 8080
- `npm run build` - Build production bundle  
- `npm run build:dev` - Build with development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Backend (backend/ Directory)
- `npm run dev` - Start Wrangler development server on port 8787
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare bindings

### Database Operations
- `npx wrangler d1 execute xml_prompt_builder --file=migrations/0001_create_prompts.sql` - Apply database migrations
- `npx wrangler d1 execute xml_prompt_builder --command="SELECT * FROM prompts"` - Query database

## Architecture Overview

### Frontend Architecture
- **Routing**: React Router with routes for /, /login, /auth/login, /account, /dashboard
- **State Management**: React Query for server state, React hooks for local state
- **Authentication**: WorkOS AuthKit with custom caching layer (`src/auth/`)
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Core Component**: `PromptBuilder.tsx` - main XML building interface with drag-and-drop, localStorage persistence

### Backend Architecture  
- **Framework**: Hono with Cloudflare Workers runtime
- **Database**: Cloudflare D1 (SQLite) with prompts table
- **Authentication**: JWT verification using WorkOS JWKS with fallback to WorkOS user API
- **API Endpoints**: Full CRUD operations for prompts under `/api/prompts`
- **CORS**: Configured for localhost:8080 (dev) and xml.soy.run (prod)

### Authentication Flow
1. Frontend redirects to WorkOS for authentication
2. Backend middleware verifies JWT tokens using JWKS
3. Fallback to WorkOS user API for opaque tokens  
4. User ID extracted and used for prompt ownership

### Key Files
- `src/components/PromptBuilder.tsx` - Main XML builder interface with visual tree editing
- `src/auth/useAuthWithCache.ts` - Custom auth hook with localStorage caching
- `backend/src/index.ts` - Hono server with auth middleware and prompt CRUD API
- `src/lib/loose-xml.ts` - XML parsing utility for import functionality

## Environment Variables

### Frontend (.env)
- `VITE_WORKOS_CLIENT_ID` - WorkOS client ID
- `VITE_WORKOS_API_HOSTNAME` - WorkOS API hostname (optional)
- `VITE_WORKOS_DEV_MODE` - Enable WorkOS dev mode (auto-detected based on NODE_ENV)

### Backend (backend/.env or wrangler.jsonc vars)
- `WORKOS_JWKS_URL` - WorkOS JWKS endpoint
- `WORKOS_AUDIENCE` - Expected JWT audience
- `WORKOS_ISSUER` - Expected JWT issuer
- `WORKOS_API_KEY` - WorkOS API key
- `WORKOS_CLIENT_ID` - WorkOS client ID
- `WORKOS_COOKIE_PASSWORD` - Cookie encryption key

## Common Issues & Refresh Token Error

The error `{"error":"invalid_request","error_description":"Missing refresh token."}` typically occurs when:

1. **WorkOS token expiration**: Access tokens expire and need refresh
2. **Cache/storage mismatch**: Stale tokens in localStorage 
3. **Environment misconfiguration**: Missing or incorrect WorkOS environment variables

**Resolution steps**:
1. Clear browser localStorage and cookies
2. Verify all WORKOS_* environment variables are set correctly
3. Check that WorkOS redirect URIs match your current domain
4. Review `src/auth/useAuthWithCache.ts` for cache clearing logic
5. Inspect network requests to `/api/prompts` for 401 responses

## Database Schema

```sql
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

- **Frontend**: Deployed to Vercel with `vercel.json` for SPA routing
- **Backend**: Deployed to Cloudflare Workers via `wrangler deploy`
- **Database**: Cloudflare D1 database managed via Wrangler
- **Domain**: Production frontend at xml.soy.run, backend at backend.soyrun.workers.dev

## Development Workflow

1. Start backend: `cd backend && npm run dev` (port 8787)
2. Start frontend: `npm run dev` (port 8080) 
3. Frontend proxies `/api/*` requests to backend
4. Use `npm run lint` before committing changes
5. Database changes require manual migration via wrangler d1 commands