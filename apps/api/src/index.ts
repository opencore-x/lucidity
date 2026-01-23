import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Router
import taskRouter from './routes/tasks.js';
import userRouter from './routes/users.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());
app.route('/api/tasks', taskRouter);
app.route('/api/users', userRouter);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
