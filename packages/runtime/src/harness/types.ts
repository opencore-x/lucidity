import type { Task, User, JournalEntry } from '@lucidity/shared';
import type { AgentExecutor, ExecutorStreamEvent } from '../executor/types.js';

/**
 * The callable harness seam (M6). It wraps the existing prompt builders so the
 * transports — the local daemon gateway (free) and the hosted server (Pro) —
 * invoke ONE surface and run identical prompts through the {@link AgentExecutor}.
 * No prompt logic lives here; this only assembles existing builders and executes.
 */

export interface AskInput {
  user: Pick<User, 'name'>;
  /** The one-shot question ("Ask Lucid"). */
  prompt: string;
  /** Durable facts (MEMORY.md), woven into the system prompt when present. */
  memory?: string;
  /** Bounded recent-notes digest from the vault. */
  notes?: string;
  /** Extra session context, e.g. a snapshot of today's tasks. */
  context?: string;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface BriefingInput {
  user: Pick<User, 'name' | 'email'>;
  /** Tasks due today or overdue (e.g. `GET /api/tasks/today`). */
  tasks: Task[];
  /** Reference "now" for the date header + overdue detection. */
  now?: Date;
  memory?: string;
  notes?: string;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** A buffered reply from a model-backed capability (ask/briefing). */
export interface HarnessReply {
  text: string;
  sessionId?: string;
  costUsd?: number;
}

export interface JournalQuery {
  /** Max entries (newest first). */
  limit?: number;
  /** ISO cursor echoed from a prior page's `nextBefore`. */
  before?: string;
}

export interface JournalResult {
  entries: JournalEntry[];
  nextBefore?: string;
}

/**
 * A transport-supplied source of Lucid's past runs. The runtime is stateless and
 * owns no storage, so journal reads delegate here: the daemon plugs in its run
 * log, the hosted server plugs in a DB. The harness just exposes a uniform read.
 */
export interface JournalSource {
  read(query: JournalQuery): Promise<JournalResult>;
}

/** The one surface both transports call. */
export interface LucidHarness {
  ask(input: AskInput): Promise<HarnessReply>;
  askStream(input: AskInput): AsyncIterable<ExecutorStreamEvent>;
  briefing(input: BriefingInput): Promise<HarnessReply>;
  briefingStream(input: BriefingInput): AsyncIterable<ExecutorStreamEvent>;
  /** Read the agent journal. Throws if no {@link JournalSource} was configured. */
  journal(query?: JournalQuery): Promise<JournalResult>;
}
