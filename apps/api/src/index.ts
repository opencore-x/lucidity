import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { clerkMiddleware } from '@hono/clerk-auth';
import { isAppError } from './lib/errors.js';
import { createRoomHandler, startRoomHeartbeat } from './room/index.js';

// Router
import taskRouter from './routes/tasks.js';
import userRouter from './routes/users.js';
import projectRouter from './routes/projects.js';
import projectMemberRouter from './routes/projectMembers.js';
import milestoneRouter from './routes/milestones.js';
import apiKeyRouter from './routes/apiKey.js';
import commentRouter from './routes/comments.js';
import timeSessionRouter from './routes/timeSessions.js';
import { taskQueryRouter, searchRouter } from './routes/taskQueries.js';
import publicRouter from './routes/public.js';

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

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

// Lucid harness room (#255): one WebSocket both the phone and the daemon dial out
// to; bridges them by userId, relays bytes opaquely (E2E). Auth at the handshake.
app.get('/api/room', createRoomHandler(upgradeWebSocket));

// Unauthenticated read-only access to public projects (anyone with the link).
app.route('/api/public', publicRouter);

app.route('/api/auth/api-key', apiKeyRouter);
app.route('/api/tasks', commentRouter);      // :taskId/comments/* must be before /:id
app.route('/api/tasks', timeSessionRouter); // :taskId/timer/*, :taskId/time-sessions/* before /:id
app.route('/api/tasks', taskQueryRouter);   // Must be before taskRouter so /today, /week match first
app.route('/api/tasks', taskRouter);
app.route('/api/users', userRouter);
app.route('/api/projects', projectMemberRouter); // :id/members/* before /:id
app.route('/api/projects', projectRouter);
app.route('/api/milestones', milestoneRouter);
app.route('/api', searchRouter);

const port = Number(process.env.PORT) || 3001;

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server running on port ${info.port}`);
  },
);

// Attach the WebSocket upgrade handler to the same server, then start the
// room's heartbeat sweep (reaps half-open phone/daemon sockets).
injectWebSocket(server);
startRoomHeartbeat();
