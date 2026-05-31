import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { RUNS_DIR } from './config.js';

export interface RunRecord {
  /** Job name, e.g. `"briefing"`. */
  job: string;
  status: 'success' | 'error';
  /** ISO 8601. */
  startedAt: string;
  /** ISO 8601. */
  finishedAt: string;
  durationMs: number;
  costUsd?: number;
  sessionId?: string;
  /** Delivery channel used (e.g. `"macos"`, `"stdout"`). */
  delivered?: string;
  /** Present when the briefing succeeded but delivery failed. */
  deliveryError?: string;
  /** New durable facts learned (written to MEMORY.md) this run. */
  factsLearned?: number;
  /** Present when `status === "error"`. */
  error?: string;
}

/**
 * Append-only run history at `~/.lucidity/runs/<YYYY-MM-DD>.jsonl` (one JSON
 * object per line, day-partitioned). Never throws — logging must not take the
 * daemon down — it warns to stderr on failure instead.
 */
export function appendRun(record: RunRecord): void {
  try {
    mkdirSync(RUNS_DIR, { recursive: true });
    const day = record.startedAt.slice(0, 10); // YYYY-MM-DD
    appendFileSync(join(RUNS_DIR, `${day}.jsonl`), JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error(`[runlog] could not write run record: ${err instanceof Error ? err.message : String(err)}`);
  }
}
