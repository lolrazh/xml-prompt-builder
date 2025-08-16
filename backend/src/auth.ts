import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

export function createAuth(env: any) {
  const db = drizzle(env.DB, { schema });
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    baseURL: env.NODE_ENV === 'production' ? 'https://api.xml.soy.run' : 'http://localhost:8787',
    trustedOrigins: ['http://localhost:8080', 'https://xml.soy.run', 'https://api.xml.soy.run'],
    emailAndPassword: {
      enabled: false, // Only OAuth for now
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: env.NODE_ENV === 'production' ? "https://api.xml.soy.run/api/auth/callback/google" : "http://localhost:8787/api/auth/callback/google",
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID || "",
        clientSecret: env.GITHUB_CLIENT_SECRET || "",
        redirect_uri: env.NODE_ENV === 'production' ? "https://api.xml.soy.run/api/auth/callback/github" : "http://localhost:8787/api/auth/callback/github",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    },
    cookies: {
      sessionToken: {
        name: "better-auth.session",
        options: {
          httpOnly: false, // Allow client-side access for cross-domain
          secure: env.NODE_ENV === 'production',
          sameSite: env.NODE_ENV === 'production' ? "none" : "lax", // Allow cross-site in production
          domain: env.NODE_ENV === 'production' ? ".xml.soy.run" : undefined, // Share cookies across xml.soy.run subdomains
        }
      }
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>