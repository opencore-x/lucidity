import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export * from './schema/tasks';

// Re-export drizzle-orm helpers
export { eq, and, or, desc, asc, isNull, isNotNull } from 'drizzle-orm';

export function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
