import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/d1"

// Mock env for CLI generation - actual values will come from Wrangler
const mockEnv = {
  DB: null, // Will be null for CLI generation
  GOOGLE_CLIENT_ID: "mock",
  GOOGLE_CLIENT_SECRET: "mock", 
  GITHUB_CLIENT_ID: "mock",
  GITHUB_CLIENT_SECRET: "mock",
  NODE_ENV: "development"
}

// Create a dummy DB for schema generation
const db = drizzle(mockEnv.DB as any);

export default betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  baseURL: "http://localhost:8787",
  trustedOrigins: ['http://localhost:8080', 'https://xml.soy.run'],
  emailAndPassword: {
    enabled: false, // Only OAuth for now
  },
  socialProviders: {
    google: {
      clientId: mockEnv.GOOGLE_CLIENT_ID,
      clientSecret: mockEnv.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: mockEnv.GITHUB_CLIENT_ID,
      clientSecret: mockEnv.GITHUB_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
})