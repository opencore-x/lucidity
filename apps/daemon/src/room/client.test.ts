import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExecutorStreamEvent, LucidHarness } from '@lucidity/runtime';
import { dispatchRequest, roomUrl, type DispatchDeps } from './client.js';

// Valid uuidv7 ids (version nibble 7, variant nibble 8) so HarnessRequestSchema accepts them.
const rid = (n: number) => `0190bd5e-6c3f-7abc-8def-${String(n).padStart(12, '0')}`;

async function* streamOf(events: ExecutorStreamEvent[]): AsyncIterable<ExecutorStreamEvent> {
  for (const ev of events) yield ev;
}

function fakeHarness(overrides: Partial<LucidHarness> = {}): LucidHarness {
  return {
    ask: async () => ({ text: 'ask-answer', sessionId: 's1', costUsd: 0.01 }),
    askStream: () => streamOf([
      { type: 'delta', text: 'he' },
      { type: 'delta', text: 'llo' },
      { type: 'done', text: 'hello', sessionId: 's2', costUsd: 0.02 },
    ]),
    briefing: async () => ({ text: 'briefing-answer', costUsd: 0.03 }),
    briefingStream: () => streamOf([{ type: 'done', text: 'brief', costUsd: 0.04 }]),
    journal: async () => ({
      entries: [{ id: 'f1', kind: 'briefing', title: 'Briefing', body: 'b', createdAt: '2026-07-02T08:00:00.000Z' }],
      nextBefore: '2026-07-02T08:00:00.000Z',
    }),
    ...overrides,
  };
}

function harness(overrides: Partial<LucidHarness> = {}): { deps: DispatchDeps; sent: unknown[] } {
  const sent: unknown[] = [];
  const deps: DispatchDeps = {
    harness: fakeHarness(overrides),
    askContext: async () => ({ user: { name: 'Ankit' } }),
    briefingContext: async () => ({ user: { name: 'Ankit', email: 'a@b.c' }, tasks: [] }),
    send: (obj) => sent.push(obj),
  };
  return { deps, sent };
}

test('ask (buffered) → AskResponse correlated by request id', async () => {
  const { deps, sent } = harness();
  await dispatchRequest(JSON.stringify({ id: rid(1), kind: 'ask', prompt: 'hi' }), deps);
  assert.deepEqual(sent, [{ requestId: rid(1), kind: 'ask', text: 'ask-answer', sessionId: 's1', costUsd: 0.01 }]);
});

test('ask (stream) → delta events then a done event', async () => {
  const { deps, sent } = harness();
  await dispatchRequest(JSON.stringify({ id: rid(2), kind: 'ask', prompt: 'hi', stream: true }), deps);
  assert.deepEqual(sent, [
    { type: 'delta', requestId: rid(2), text: 'he' },
    { type: 'delta', requestId: rid(2), text: 'llo' },
    { type: 'done', requestId: rid(2), text: 'hello', sessionId: 's2', costUsd: 0.02 },
  ]);
});

test('briefing (buffered) → BriefingResponse', async () => {
  const { deps, sent } = harness();
  await dispatchRequest(JSON.stringify({ id: rid(3), kind: 'briefing' }), deps);
  assert.deepEqual(sent, [{ requestId: rid(3), kind: 'briefing', text: 'briefing-answer', costUsd: 0.03 }]);
});

test('journal → JournalResponse with entries + cursor', async () => {
  const { deps, sent } = harness();
  await dispatchRequest(JSON.stringify({ id: rid(4), kind: 'journal', limit: 10 }), deps);
  assert.deepEqual(sent, [
    {
      requestId: rid(4),
      kind: 'journal',
      entries: [{ id: 'f1', kind: 'briefing', title: 'Briefing', body: 'b', createdAt: '2026-07-02T08:00:00.000Z' }],
      nextBefore: '2026-07-02T08:00:00.000Z',
    },
  ]);
});

test('a harness failure becomes a correlated error event', async () => {
  const { deps, sent } = harness({
    ask: async () => {
      throw new Error('engine down');
    },
  });
  await dispatchRequest(JSON.stringify({ id: rid(5), kind: 'ask', prompt: 'hi' }), deps);
  assert.deepEqual(sent, [{ type: 'error', requestId: rid(5), message: 'engine down' }]);
});

test('invalid JSON and schema-invalid requests are dropped (no reply)', async () => {
  const { deps, sent } = harness();
  await dispatchRequest('not json', deps);
  await dispatchRequest(JSON.stringify({ id: 'not-a-uuid', kind: 'ask', prompt: 'hi' }), deps);
  await dispatchRequest(JSON.stringify({ id: rid(6), kind: 'unknown' }), deps);
  assert.equal(sent.length, 0);
});

test('roomUrl upgrades http→ws and https→wss and sets role=daemon', () => {
  assert.equal(roomUrl('http://localhost:3001'), 'ws://localhost:3001/api/room?role=daemon');
  assert.equal(roomUrl('https://api.lucidity.my'), 'wss://api.lucidity.my/api/room?role=daemon');
});
