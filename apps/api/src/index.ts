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
import milestoneRouter from './routes/milestones.js';
import apiKeyRouter from './routes/apiKey.js';
import commentRouter from './routes/comments.js';
import timeSessionRouter from './routes/timeSessions.js';
import { taskQueryRouter, searchRouter } from './routes/taskQueries.js';

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

app.route('/api/auth/api-key', apiKeyRouter);
app.route('/api/tasks', commentRouter);      // :taskId/comments/* must be before /:id
app.route('/api/tasks', timeSessionRouter); // :taskId/timer/*, :taskId/time-sessions/* before /:id
app.route('/api/tasks', taskQueryRouter);   // Must be before taskRouter so /today, /week match first
app.route('/api/tasks', taskRouter);
app.route('/api/users', userRouter);
app.route('/api/projects', projectRouter);
app.route('/api/milestones', milestoneRouter);
app.route('/api', searchRouter);

const port = Number(process.env.PORT) || 3001;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server running on port ${info.port}`);
  },
);
