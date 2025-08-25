import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

export function createAuth(env: any) {
  const db = drizzle(env.DB, { schema });
  
  // Get configuration from environment variables with fallbacks
  const baseURL = env.AUTH_BASE_URL || (env.NODE_ENV === 'production' ? 'https://xmb.soy.run' : 'http://localhost:8787');
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()) : [
    'http://localhost:8080', 
    'https://xml.soy.run', 
    'https://xmb.soy.run', 
    'https://xml-prompt-builder-import-patch.vercel.app'
  ];
  
  // Cookie configuration - domain-agnostic for cross-domain support
  const cookieConfig = {
    httpOnly: false, // Allow client-side access for cross-domain
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? "none" : "lax", // Allow cross-site in production
    // Remove domain restriction for cross-domain compatibility
    domain: env.COOKIE_DOMAIN || undefined,
  };
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    baseURL,
    trustedOrigins: allowedOrigins,
    emailAndPassword: {
      enabled: false, // Only OAuth for now
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${baseURL}/api/auth/callback/google`,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID || "",
        clientSecret: env.GITHUB_CLIENT_SECRET || "",
        redirect_uri: `${baseURL}/api/auth/callback/github`,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      // Disable cookie-based sessions for cross-domain compatibility
      cookieCache: {
        enabled: false,
      },
    },
    // Remove cookie dependency for cross-domain support
    cookies: {
      sessionToken: {
        name: "better-auth.session",
        options: {
          httpOnly: false, // Allow client-side access
          secure: env.NODE_ENV === 'production',
          sameSite: "none", // Allow cross-site requests
          domain: undefined, // Don't restrict domain
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