import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export * from './schema/tasks';

export function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
