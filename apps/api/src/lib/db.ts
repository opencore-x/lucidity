import { createDb } from '@opentask/db';

export const db = createDb(process.env.DATABASE_URL!);
