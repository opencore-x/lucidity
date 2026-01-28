import { createDb } from '@lucidity/db';

export const db = createDb(process.env.DATABASE_URL!);
