#!/usr/bin/env node
import { ClaudeCodeExecutor } from '@lucidity/runtime';
import { loadConfig } from './config.js';
import { LaneQueue } from './queue.js';
import { Scheduler } from './scheduler.js';
import { runJob } from './jobs/runner.js';
import { runBriefing } from './jobs/briefing.js';
import { runWeeklyReview } from './jobs/weeklyReview.js';
import { createDeliverer, isDeliveryChannel } from './delivery/index.js';
import { installAgent, uninstallAgent, agentStatus } from './install.js';
import { createChatServer } from './chat/server.js';
import { ensureChatToken } from './chat/token.js';
import { runChatCli } from './chat/client.js';

const KNOWN_JOBS = ['briefing', 'weekly-review'] as const;

interface CliArgs {
  command?: string;
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
    } else if (arg && !arg.startsWith('-') && args.command === undefined) {
      args.command = arg;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Service-management commands (manage the launchd agent; handled before config
  // so `status`/`uninstall` work even without a valid config).
  switch (args.command) {
    case 'install':
      installAgent();
      return;
    case 'uninstall':
      uninstallAgent();
      return;
    case 'status':
      agentStatus();
      return;
  }

  const config = loadConfig();

  // Interactive chat: a thin CLI client of the running daemon's chat server.
  if (args.command === 'chat') {
    await runChatCli(config);
    return;
  }
  if (args.command !== undefined) {
    console.error(
      `Unknown command "${args.command}". Known: install, uninstall, status, chat. ` +
        `(Use --run-now <job> to run a job once.)`,
    );
    process.exit(1);
  }

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
    const jobName = args.runNow;
    if (jobName === 'briefing') {
      await runJob('briefing', queue, () => runBriefing(config, executor, deliverer));
    } else if (jobName === 'weekly-review') {
      await runJob('weekly-review', queue, () => runWeeklyReview(config, executor, deliverer));
    } else {
      console.error(`Unknown job "${jobName}". Known jobs: ${KNOWN_JOBS.join(', ')}.`);
      process.exit(1);
    }
    return;
  }

  // Default mode: run the scheduler in the foreground.
  const scheduler = new Scheduler();
  const briefingJob = scheduler.scheduleDaily(
    config.briefingTime,
    () => void runJob('briefing', queue, () => runBriefing(config, executor, deliverer)),
    { timezone: config.timezone },
  );
  if (config.weeklyReview) {
    scheduler.scheduleWeekly(
      config.weeklyReviewDay,
      config.weeklyReviewTime,
      () => void runJob('weekly-review', queue, () => runWeeklyReview(config, executor, deliverer)),
      { timezone: config.timezone },
    );
  }

  // Interactive chat server (lite local gateway): loopback + token auth.
  const chatServer = createChatServer({ config, executor, token: ensureChatToken(), queue });
  chatServer.listen(config.chatPort, '127.0.0.1');

  const tz = config.timezone ? ` ${config.timezone}` : '';
  const next = briefingJob.nextRun();
  const weekly = config.weeklyReview ? `; weekly review ${config.weeklyReviewTime} (day ${config.weeklyReviewDay})` : '';
  console.error(
    `[daemon] Lucid daemon started. Briefing ${config.briefingTime}${tz} → ${deliverer.name}${weekly}. ` +
      `Next briefing: ${next ? next.toISOString() : 'unknown'}. Chat on 127.0.0.1:${config.chatPort}.`,
  );

  const shutdown = () => {
    console.error('[daemon] shutting down.');
    scheduler.stop();
    chatServer.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
