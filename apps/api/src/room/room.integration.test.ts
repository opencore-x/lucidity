import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, type ServerType } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { WebSocket } from 'ws';
import { createRoomHandler } from './index.js';

/**
 * Drives the REAL room endpoint over actual WebSockets — upgrade, onOpen/
 * onMessage/onClose, the registry — with only auth stubbed (the DI seam). The
 * stub resolves the userId from a `?userId=` query param so two clients can pair.
 */

let server: ServerType;
let port: number;

before(async () => {
  const app = new Hono();
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  const fakeAuth = async (c: { req: { query: (k: string) => string | undefined } }) => {
    const id = c.req.query('userId');
    return id ? { id } : null;
  };
  app.get('/api/room', createRoomHandler(upgradeWebSocket, fakeAuth as never));

  port = await new Promise<number>((resolve) => {
    server = serve({ fetch: app.fetch, port: 0 }, (info) => resolve(info.port));
    injectWebSocket(server);
  });
});

after(() => {
  server?.close();
});

function connect(role: 'phone' | 'daemon', userId: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/room?role=${role}&userId=${userId}`);
  const inbox: string[] = [];
  ws.on('message', (d) => inbox.push(d.toString()));
  const open = new Promise<void>((res, rej) => {
    ws.on('open', () => res());
    ws.on('error', rej);
  });
  return { ws, inbox, open };
}

function waitFor(cond: () => boolean, ms = 3000, label = '') {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (cond()) {
        clearInterval(t);
        resolve();
      } else if (Date.now() - start > ms) {
        clearInterval(t);
        reject(new Error(`timeout: ${label}`));
      }
    }, 25);
  });
}

test('bridges phone <-> daemon over a real socket, opaquely', async () => {
  const daemon = connect('daemon', 'u1');
  const phone = connect('phone', 'u1');
  await Promise.all([daemon.open, phone.open]);

  phone.ws.send('cipher-up');
  await waitFor(() => daemon.inbox.includes('cipher-up'), 3000, 'daemon receives');

  daemon.ws.send('cipher-down');
  await waitFor(() => phone.inbox.includes('cipher-down'), 3000, 'phone receives');

  phone.ws.close();
  daemon.ws.close();
});

test('a reconnecting phone re-pairs and bridging resumes', async () => {
  const daemon = connect('daemon', 'u2');
  const phone1 = connect('phone', 'u2');
  await Promise.all([daemon.open, phone1.open]);

  phone1.ws.close();
  await waitFor(() => phone1.ws.readyState === WebSocket.CLOSED, 3000, 'phone1 closed');

  const phone2 = connect('phone', 'u2');
  await phone2.open;
  phone2.ws.send('after-reconnect');
  await waitFor(() => daemon.inbox.includes('after-reconnect'), 3000, 'daemon receives post-reconnect');

  phone2.ws.close();
  daemon.ws.close();
});

test('an unauthenticated socket (no userId) is closed', async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/room?role=phone`);
  const closeCode = await new Promise<number>((resolve, reject) => {
    ws.on('close', (code) => resolve(code));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('no close')), 3000);
  });
  assert.equal(closeCode, 4401);
});
