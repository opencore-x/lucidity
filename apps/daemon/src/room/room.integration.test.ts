import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { LucidHarness } from '@lucidity/runtime';
import type { DaemonConfig } from '../config.js';
import type { Vault } from '../vault.js';
import { startRoomClient } from './client.js';

/**
 * Drives the REAL daemon room client over an actual socket: a `ws` server stands
 * in for the hosted room + phone, sends a harness request, and asserts the
 * client dials with the `luc_` auth header and streams back the harness reply.
 * The harness is faked so no `claude -p` process is spawned.
 */

const rid = (n: number) => `0190bd5e-6c3f-7abc-8def-${String(n).padStart(12, '0')}`;

const baseConfig = (port: number): DaemonConfig => ({
  apiKey: 'luc_test',
  apiUrl: `http://127.0.0.1:${port}`,
  briefingTime: '08:00',
  delivery: 'stdout',
  vaultPath: '/tmp/lucid-nonexistent-vault',
  reflect: false,
  chatPort: 4849,
  weeklyReview: false,
  weeklyReviewDay: 0,
  weeklyReviewTime: '18:00',
});

const fakeVault: Vault = {
  path: '',
  readPersona: () => 'persona',
  readMemoryFacts: () => [],
  writeMemoryFacts: () => {},
  writeSessionLog: () => {},
};

const fakeHarness: LucidHarness = {
  ask: async () => ({ text: 'PONG', sessionId: 'sess-1' }),
  askStream: async function* () {},
  briefing: async () => ({ text: 'brief' }),
  briefingStream: async function* () {},
  journal: async () => ({ entries: [] }),
};

function startTestServer(): Promise<{ server: Server; wss: WebSocketServer; port: number }> {
  return new Promise((resolve) => {
    // 404 non-upgrade requests fast so the client's best-effort context fetch
    // (GET /api/users/me) fails immediately instead of hanging.
    const server = createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    const wss = new WebSocketServer({ server });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, wss, port: typeof addr === 'object' && addr ? addr.port : 0 });
    });
  });
}

test('daemon client dials with auth, and an ask round-trips back as an AskResponse', { timeout: 5000 }, async () => {
  const { server, wss, port } = await startTestServer();

  const gotResponse = new Promise<Record<string, unknown>>((resolve, reject) => {
    wss.on('connection', (ws: WebSocket, req) => {
      try {
        assert.equal(req.headers.authorization, 'Bearer luc_test');
        assert.ok(req.url?.includes('role=daemon'));
      } catch (err) {
        reject(err);
        return;
      }
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;
        if (msg.kind === 'ask') resolve(msg);
      });
      ws.send(JSON.stringify({ id: rid(1), kind: 'ask', prompt: 'ping' }));
    });
  });

  const client = startRoomClient({ config: baseConfig(port), harness: fakeHarness, vault: fakeVault, logger: () => {} });

  try {
    const response = await gotResponse;
    assert.equal(response.requestId, rid(1));
    assert.equal(response.text, 'PONG');
    assert.equal(response.sessionId, 'sess-1');
  } finally {
    client.stop();
    wss.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
