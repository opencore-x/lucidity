import {
  buildWeeklyReviewPrompt,
  createApiClient,
  type AgentExecutor,
  type WeeklyReviewStats,
} from '@lucidity/runtime';
import type { Task, User } from '@lucidity/shared';
import type { DaemonConfig } from '../config.js';
import type { Deliverer } from '../delivery/index.js';
import { createVault } from '../vault.js';
import { loadNotesContext } from '../notesContext.js';
import type { JobResult } from './runner.js';

/**
 * The weekly-review job: fetches this week's tasks + aggregate stats + profile,
 * reads vault persona/memory, builds the review, runs the executor, delivers a
 * notification, and writes a session log. (No reflection step — that belongs to
 * the daily briefing.)
 */
export async function runWeeklyReview(
  config: DaemonConfig,
  executor: AgentExecutor,
  deliverer: Deliverer,
): Promise<JobResult> {
  const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });
  const [tasks, stats, user] = await Promise.all([
    api.request<Task[]>('/api/tasks/week'),
    api.request<WeeklyReviewStats>('/api/tasks/stats'),
    api.request<User>('/api/users/me'),
  ]);

  const vault = createVault(config.vaultPath);
  const persona = vault.readPersona();
  const facts = vault.readMemoryFacts();
  const memory = facts.length ? facts.map((f) => `- ${f}`).join('\n') : undefined;
  const notes = loadNotesContext(config);

  const { systemPrompt, userPrompt } = buildWeeklyReviewPrompt({ user, tasks, stats, persona, memory, notes });
  const result = await executor.run({ systemPrompt, userPrompt, model: config.model });
  const text = result.text;

  let deliveryError: string | undefined;
  try {
    await deliverer.deliver({ title: 'Lucidity', body: text });
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : String(err);
    console.error(`[weekly-review] delivery via ${deliverer.name} failed: ${deliveryError}`);
  }

  vault.writeSessionLog({
    startedAt: new Date().toISOString(),
    kind: 'weekly-review',
    body: text,
    deliveredVia: deliveryError ? `${deliverer.name} (failed)` : deliverer.name,
    factsLearned: [],
  });

  return { text, costUsd: result.costUsd, sessionId: result.sessionId, delivered: deliverer.name, deliveryError };
}
