import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChatSystemPrompt } from './chat.js';

const USER = { name: 'Ada' };

test('includes persona, conversational framing, and the name', () => {
  const sys = buildChatSystemPrompt({ persona: 'PERSONA', user: USER });
  assert.ok(sys.startsWith('PERSONA\n---'));
  assert.ok(sys.includes('live, back-and-forth conversation with Ada'));
  assert.ok(!sys.includes('undefined'));
});

test('weaves in memory and context when provided', () => {
  const sys = buildChatSystemPrompt({
    persona: 'PERSONA',
    user: USER,
    memory: '- Prefers mornings',
    context: "Today's tasks: File taxes",
  });
  assert.ok(sys.includes('What you remember about Ada:\n- Prefers mornings'));
  assert.ok(sys.includes("Context for this session:\nToday's tasks: File taxes"));
});

test('omits memory/context sections when absent', () => {
  const sys = buildChatSystemPrompt({ persona: 'PERSONA', user: USER });
  assert.ok(!sys.includes('What you remember'));
  assert.ok(!sys.includes('Context for this session'));
});

test('falls back to a generic name', () => {
  assert.ok(buildChatSystemPrompt({ persona: 'P', user: { name: '' } }).includes('conversation with the user'));
});
