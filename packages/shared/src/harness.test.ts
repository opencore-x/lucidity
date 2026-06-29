import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HarnessRequestSchema,
  HarnessResponseSchema,
  HarnessStreamEventSchema,
} from './schemas/harness.js';

const ID = '019ea7c7-8446-75fa-b6fc-41c7e7cb7204';

test('ask request parses and defaults senderKind to human', () => {
  const parsed = HarnessRequestSchema.parse({ id: ID, kind: 'ask', prompt: 'what now?' });
  assert.equal(parsed.kind, 'ask');
  assert.equal(parsed.senderKind, 'human');
});

test('briefing request needs no payload beyond the envelope', () => {
  const parsed = HarnessRequestSchema.parse({ id: ID, kind: 'briefing', senderKind: 'agent' });
  assert.equal(parsed.kind, 'briefing');
  assert.equal(parsed.senderKind, 'agent');
});

test('ask request rejects an empty prompt', () => {
  assert.throws(() => HarnessRequestSchema.parse({ id: ID, kind: 'ask', prompt: '' }));
});

test('unknown request kind is rejected', () => {
  assert.throws(() => HarnessRequestSchema.parse({ id: ID, kind: 'delete-everything' }));
});

test('journal response carries entries and an optional cursor', () => {
  const parsed = HarnessResponseSchema.parse({
    requestId: ID,
    kind: 'journal',
    entries: [{ id: 'r1', kind: 'briefing', title: 'Today', body: '...', createdAt: '2026-06-29T08:00:00Z' }],
    nextBefore: '2026-06-29T08:00:00Z',
  });
  assert.equal(parsed.kind, 'journal');
  assert.equal(parsed.kind === 'journal' && parsed.entries.length, 1);
});

test('stream events discriminate delta, tool_call, done, error', () => {
  for (const evt of [
    { type: 'delta', requestId: ID, text: 'hi' },
    { type: 'tool_call', requestId: ID, name: 'list_tasks', phase: 'start' },
    { type: 'done', requestId: ID, text: 'final', costUsd: 0.01 },
    { type: 'error', requestId: ID, message: 'boom' },
  ]) {
    assert.equal(HarnessStreamEventSchema.parse(evt).type, evt.type);
  }
});
