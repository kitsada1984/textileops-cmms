// src/db/client.js
// Drizzle ORM client factory for Cloudflare D1
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * Initializes a type-safe Drizzle client instance from Cloudflare D1 binding.
 * @param {D1Database} d1Binding - The env.DB binding provided by Cloudflare Pages / Workers
 * @returns {import('drizzle-orm/d1').DrizzleD1Database<typeof schema>}
 */
export function createDrizzleClient(d1Binding) {
  if (!d1Binding) {
    throw new Error('D1Database binding is required to create Drizzle client')
  }
  return drizzle(d1Binding, { schema })
}

export default createDrizzleClient
