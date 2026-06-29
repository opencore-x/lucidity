import { buildBriefingPrompt } from '../prompts/briefing.js';
import { buildChatSystemPrompt } from '../prompts/chat.js';
import type { AgentExecutor } from '../executor/types.js';
import type {
  AskInput,
  BriefingInput,
  JournalQuery,
  JournalSource,
  LucidHarness,
} from './types.js';

export type {
  AskInput,
  BriefingInput,
  HarnessReply,
  JournalQuery,
  JournalResult,
  JournalSource,
  LucidHarness,
} from './types.js';

export interface LucidHarnessDeps {
  /** The model engine. Free = ClaudeCodeExecutor; Pro = a hosted SDK executor. */
  executor: AgentExecutor;
  /** Persona/system text (SOUL.md or the packaged default). */
  persona: string;
  /** Optional run-log/DB source for journal reads (transport supplies it). */
  journalSource?: JournalSource;
}

/**
 * Build the one callable surface the transports invoke (#249). Each method
 * assembles an EXISTING prompt builder and runs it through the AgentExecutor, so
 * the daemon and the hosted server never duplicate prompt logic — they share
 * this. `ask`/`briefing` are model-backed; `journal` is a pass-through read.
 */
export function createLucidHarness(deps: LucidHarnessDeps): LucidHarness {
  const { executor, persona, journalSource } = deps;

  function askPrompts(input: AskInput) {
    const systemPrompt = buildChatSystemPrompt({
      persona,
      user: { name: input.user.name },
      memory: input.memory,
      notes: input.notes,
      context: input.context,
    });
    return { systemPrompt, userPrompt: input.prompt };
  }

  function briefingPrompts(input: BriefingInput) {
    return buildBriefingPrompt({
      user: input.user,
      tasks: input.tasks,
      persona,
      now: input.now,
      memory: input.memory,
      notes: input.notes,
    });
  }

  function streamFn(): NonNullable<AgentExecutor['runStream']> {
    if (!executor.runStream) {
      throw new Error(`Executor "${executor.name}" does not support streaming.`);
    }
    return executor.runStream.bind(executor);
  }

  return {
    async ask(input) {
      const { systemPrompt, userPrompt } = askPrompts(input);
      const result = await executor.run({
        systemPrompt,
        userPrompt,
        model: input.model,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      });
      return { text: result.text, sessionId: result.sessionId, costUsd: result.costUsd };
    },

    askStream(input) {
      const run = streamFn();
      const { systemPrompt, userPrompt } = askPrompts(input);
      return run({
        systemPrompt,
        userPrompt,
        model: input.model,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      });
    },

    async briefing(input) {
      const { systemPrompt, userPrompt } = briefingPrompts(input);
      const result = await executor.run({
        systemPrompt,
        userPrompt,
        model: input.model,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      });
      return { text: result.text, sessionId: result.sessionId, costUsd: result.costUsd };
    },

    briefingStream(input) {
      const run = streamFn();
      const { systemPrompt, userPrompt } = briefingPrompts(input);
      return run({
        systemPrompt,
        userPrompt,
        model: input.model,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      });
    },

    async journal(query: JournalQuery = {}) {
      if (!journalSource) {
        throw new Error('This harness has no journal source configured.');
      }
      return journalSource.read(query);
    },
  };
}
