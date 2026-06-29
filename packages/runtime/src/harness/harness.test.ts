import test from 'node:test';
import assert from 'node:assert/strict';
import { createLucidHarness } from './index.js';
import type { AgentExecutor, ExecutorRunInput, ExecutorStreamEvent } from '../executor/types.js';
import type { JournalSource } from './types.js';

/** A fake executor that records the last input and returns canned output. */
function fakeExecutor(): AgentExecutor & { last?: ExecutorRunInput } {
  const self: AgentExecutor & { last?: ExecutorRunInput } = {
    name: 'fake',
    async run(input) {
      self.last = input;
      return { text: 'reply', sessionId: 's1', costUsd: 0.001 };
    },
    async *runStream(input) {
      self.last = input;
      const events: ExecutorStreamEvent[] = [
        { type: 'delta', text: 'hi' },
        { type: 'done', text: 'hi there', sessionId: 's1' },
      ];
      for (const e of events) yield e;
    },
  };
  return self;
}

const PERSONA = 'You are Lucid, a calm personal agent.';

test('ask: builds the chat system prompt (persona woven in) and executes', async () => {
  const exec = fakeExecutor();
  const harness = createLucidHarness({ executor: exec, persona: PERSONA });

  const reply = await harness.ask({ user: { name: 'Ankit' }, prompt: 'what now?' });

  assert.equal(reply.text, 'reply');
  assert.equal(exec.last?.userPrompt, 'what now?');
  assert.ok(exec.last?.systemPrompt?.includes(PERSONA), 'persona is in the system prompt');
  assert.ok(exec.last?.systemPrompt?.includes('Ankit'), 'user name is in the system prompt');
});

test('briefing: builds the briefing prompt from tasks and executes', async () => {
  const exec = fakeExecutor();
  const harness = createLucidHarness({ executor: exec, persona: PERSONA });

  const reply = await harness.briefing({
    user: { name: 'Ankit', email: 'a@b.co' },
    tasks: [],
    now: new Date('2026-06-29T09:00:00Z'),
  });

  assert.equal(reply.costUsd, 0.001);
  assert.ok(exec.last?.systemPrompt && exec.last.systemPrompt.length > 0);
  assert.ok(exec.last?.userPrompt && exec.last.userPrompt.length > 0);
});

test('askStream: streams executor events through the seam', async () => {
  const exec = fakeExecutor();
  const harness = createLucidHarness({ executor: exec, persona: PERSONA });

  const seen: string[] = [];
  for await (const evt of harness.askStream({ user: { name: 'Ankit' }, prompt: 'hi' })) {
    seen.push(evt.type);
  }
  assert.deepEqual(seen, ['delta', 'done']);
});

test('journal: delegates to the configured source', async () => {
  const source: JournalSource = {
    async read(query) {
      return {
        entries: [
          { id: 'r1', kind: 'briefing', title: 'Today', body: '...', createdAt: '2026-06-29T08:00:00Z' },
        ],
        nextBefore: query.before,
      };
    },
  };
  const harness = createLucidHarness({ executor: fakeExecutor(), persona: PERSONA, journalSource: source });

  const result = await harness.journal({ limit: 10 });
  assert.equal(result.entries.length, 1);
});

test('journal: throws when no source is configured', async () => {
  const harness = createLucidHarness({ executor: fakeExecutor(), persona: PERSONA });
  await assert.rejects(() => harness.journal(), /no journal source/i);
});

test('askStream: throws if the executor cannot stream', () => {
  const nonStreaming: AgentExecutor = { name: 'buffered-only', async run() { return { text: 'x' }; } };
  const harness = createLucidHarness({ executor: nonStreaming, persona: PERSONA });
  assert.throws(() => harness.askStream({ user: { name: 'Ankit' }, prompt: 'hi' }), /does not support streaming/i);
});
