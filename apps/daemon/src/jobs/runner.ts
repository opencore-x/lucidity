import { appendRun } from '../runlog.js';
import { LaneQueue } from '../queue.js';

/** Common result shape every job returns, for the run log. */
export interface JobResult {
  text: string;
  costUsd?: number;
  sessionId?: string;
  delivered?: string;
  deliveryError?: string;
  factsLearned?: number;
}

/**
 * Runs a job on its serialized lane (lane = job name): times it, writes the
 * text transcript to stdout (the launchd log / `--run-now` terminal), and
 * appends a run record. Rethrows so `--run-now` exits non-zero on failure.
 */
export function runJob(name: string, queue: LaneQueue, fn: () => Promise<JobResult>): Promise<void> {
  return queue.run(name, async () => {
    const startedAt = new Date();
    try {
      const result = await fn();
      const finishedAt = new Date();
      process.stdout.write(`\n${result.text}\n\n`);
      appendRun({
        job: name,
        status: 'success',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        costUsd: result.costUsd,
        sessionId: result.sessionId,
        delivered: result.delivered,
        deliveryError: result.deliveryError,
        factsLearned: result.factsLearned,
      });
    } catch (err) {
      const finishedAt = new Date();
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${name}] failed: ${message}`);
      appendRun({
        job: name,
        status: 'error',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        error: message,
      });
      throw err;
    }
  });
}
