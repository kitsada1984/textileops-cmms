import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '392e2aeb2648effccebd585e5c29611b',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || 'b54a2924-8238-408b-ab82-b329dcc6e16d',
    token: process.env.CLOUDFLARE_D1_TOKEN || '',
  },
})
