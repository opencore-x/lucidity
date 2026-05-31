#!/usr/bin/env node
import { ClaudeCodeExecutor, type AgentExecutor } from '@lucidity/runtime';
import { loadConfig, type DaemonConfig } from './config.js';
import { LaneQueue } from './queue.js';
import { Scheduler } from './scheduler.js';
import { appendRun } from './runlog.js';
import { runBriefing } from './jobs/briefing.js';
import { createDeliverer, isDeliveryChannel, type Deliverer } from './delivery/index.js';

const KNOWN_JOBS = ['briefing'] as const;
type JobName = (typeof KNOWN_JOBS)[number];

interface CliArgs {
  runNow?: string;
  deliver?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--run-now') {
      args.runNow = argv[++i];
    } else if (arg?.startsWith('--run-now=')) {
      args.runNow = arg.slice('--run-now='.length);
    } else if (arg === '--deliver') {
      args.deliver = argv[++i];
    } else if (arg?.startsWith('--deliver=')) {
      args.deliver = arg.slice('--deliver='.length);
    }
  }
  return args;
}

/**
 * Runs the briefing on its serialized lane: prints the briefing to stdout
 * (logs go to stderr, so stdout stays pipeable) and appends a run record.
 * Rethrows so `--run-now` exits non-zero on failure.
 */
function executeBriefing(
  config: DaemonConfig,
  executor: AgentExecutor,
  queue: LaneQueue,
  deliverer: Deliverer,
): Promise<void> {
  return queue.run('briefing', async () => {
    const startedAt = new Date();
    try {
      const result = await runBriefing(config, executor);
      const finishedAt = new Date();
      // Always write the full briefing to stdout — the transcript (under
      // launchd this is the log file; for --run-now it's your terminal).
      process.stdout.write(`\n${result.text}\n\n`);
      // Then push to the user-facing channel. A delivery failure is a warning,
      // not a run failure — the briefing was produced.
      let deliveryError: string | undefined;
      try {
        await deliverer.deliver({ title: 'Lucid', body: result.text });
      } catch (err) {
        deliveryError = err instanceof Error ? err.message : String(err);
        console.error(`[briefing] delivery via ${deliverer.name} failed: ${deliveryError}`);
      }
      appendRun({
        job: 'briefing',
        status: 'success',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        costUsd: result.costUsd,
        sessionId: result.sessionId,
        delivered: deliverer.name,
        deliveryError,
      });
    } catch (err) {
      const finishedAt = new Date();
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[briefing] failed: ${message}`);
      appendRun({
        job: 'briefing',
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const executor = new ClaudeCodeExecutor({
    defaultModel: config.model,
    oauthToken: config.oauthToken,
  });
  const queue = new LaneQueue();

  // Delivery channel: --deliver overrides config.delivery.
  const channel = args.deliver ?? config.delivery;
  if (!isDeliveryChannel(channel)) {
    console.error(`Unknown delivery channel "${channel}". Known: macos, stdout.`);
    process.exit(1);
  }
  const deliverer = createDeliverer(channel);

  // One-shot mode: run a job once and exit.
  if (args.runNow !== undefined) {
    if (!KNOWN_JOBS.includes(args.runNow as JobName)) {
      console.error(`Unknown job "${args.runNow}". Known jobs: ${KNOWN_JOBS.join(', ')}.`);
      process.exit(1);
    }
    await executeBriefing(config, executor, queue, deliverer);
    return;
  }

  // Default mode: run the scheduler in the foreground.
  const scheduler = new Scheduler();
  const job = scheduler.scheduleDaily(
    config.briefingTime,
    () => {
      void executeBriefing(config, executor, queue, deliverer);
    },
    { timezone: config.timezone },
  );

  const tz = config.timezone ? ` ${config.timezone}` : '';
  const next = job.nextRun();
  console.error(
    `[daemon] Lucid daemon started. Briefing at ${config.briefingTime}${tz} → ${deliverer.name}. ` +
      `Next run: ${next ? next.toISOString() : 'unknown'}.`,
  );

  const shutdown = () => {
    console.error('[daemon] shutting down.');
    scheduler.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
