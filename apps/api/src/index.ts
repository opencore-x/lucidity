import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { clerkMiddleware } from '@hono/clerk-auth';
import { isAppError } from './lib/errors.js';

// Router
import taskRouter from './routes/tasks.js';
import userRouter from './routes/users.js';
import projectRouter from './routes/projects.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());
app.use('*', clerkMiddleware());

app.onError((err, c) => {
  if (isAppError(err)) {
    return c.json({ error: err.message, code: err.code }, err.statusCode);
  }

  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.get('/', (c) => c.json({ status: 'ok' }));

app.route('/api/tasks', taskRouter);
app.route('/api/users', userRouter);
app.route('/api/projects', projectRouter);

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server running on port ${info.port}`);
  },
);
