import {
  buildBriefingPrompt,
  buildMemoryReflectionPrompt,
  createApiClient,
  mergeFacts,
  parseFacts,
  type AgentExecutor,
} from '@lucidity/runtime';
import type { Task, User } from '@lucidity/shared';
import type { DaemonConfig } from '../config.js';
import type { Deliverer } from '../delivery/index.js';
import { createVault } from '../vault.js';

export interface BriefingResult {
  text: string;
  costUsd?: number;
  sessionId?: string;
  /** Delivery channel used. */
  delivered: string;
  /** Present if the briefing succeeded but delivery failed. */
  deliveryError?: string;
  /** Number of new durable facts learned this run. */
  factsLearned: number;
}

/**
 * The daily briefing pipeline:
 *   1. fetch today's tasks + profile
 *   2. read persona (SOUL.md) + durable facts (MEMORY.md) from the vault
 *   3. assemble + run the briefing
 *   4. deliver (notification) — failure is a warning, not a run failure
 *   5. reflect → merge new facts into MEMORY.md (if config.reflect)
 *   6. write a session log
 * Returns metadata for the run log. stdout transcript + run-record timing are
 * handled by the caller.
 */
export async function runBriefing(
  config: DaemonConfig,
  executor: AgentExecutor,
  deliverer: Deliverer,
): Promise<BriefingResult> {
  const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });
  const [tasks, user] = await Promise.all([
    api.request<Task[]>('/api/tasks/today'),
    api.request<User>('/api/users/me'),
  ]);

  const vault = createVault(config.vaultPath);
  const persona = vault.readPersona();
  const facts = vault.readMemoryFacts();
  const memory = facts.length ? facts.map((f) => `- ${f}`).join('\n') : undefined;

  // 1. Briefing
  const prompt = buildBriefingPrompt({ user, tasks, persona, memory });
  const briefing = await executor.run({
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    model: config.model,
  });
  const text = briefing.text;
  let costUsd = briefing.costUsd;

  // 2. Deliver
  let deliveryError: string | undefined;
  try {
    await deliverer.deliver({ title: 'Lucid', body: text });
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : String(err);
    console.error(`[briefing] delivery via ${deliverer.name} failed: ${deliveryError}`);
  }

  // 3. Reflect → update MEMORY.md (best-effort; never fails the run)
  let learned: string[] = [];
  if (config.reflect) {
    try {
      const rp = buildMemoryReflectionPrompt({ persona, user, tasks, briefing: text, memory });
      const reflection = await executor.run({
        systemPrompt: rp.systemPrompt,
        userPrompt: rp.userPrompt,
        model: config.model,
      });
      if (reflection.costUsd != null) costUsd = (costUsd ?? 0) + reflection.costUsd;
      learned = parseFacts(reflection.text);
      if (learned.length) vault.writeMemoryFacts(mergeFacts(facts, learned));
    } catch (err) {
      console.error(`[briefing] reflection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Session log
  vault.writeSessionLog({
    startedAt: new Date().toISOString(),
    briefing: text,
    deliveredVia: deliveryError ? `${deliverer.name} (failed)` : deliverer.name,
    factsLearned: learned,
  });

  return {
    text,
    costUsd,
    sessionId: briefing.sessionId,
    delivered: deliverer.name,
    deliveryError,
    factsLearned: learned.length,
  };
}
