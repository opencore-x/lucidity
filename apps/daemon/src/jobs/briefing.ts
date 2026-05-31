import {
  buildBriefingPrompt,
  createApiClient,
  loadDefaultPersona,
  type AgentExecutor,
} from '@lucidity/runtime';
import type { Task, User } from '@lucidity/shared';
import type { DaemonConfig } from '../config.js';

export interface BriefingResult {
  text: string;
  costUsd?: number;
  sessionId?: string;
}

/**
 * The daily briefing job. Fetches the user's today/overdue tasks and profile,
 * assembles the prompt (data pre-fetched here → the executor makes no tool
 * calls), runs the executor, and returns the briefing text + run metadata.
 * Delivery (stdout) and run-logging are handled by the caller.
 */
export async function runBriefing(
  config: DaemonConfig,
  executor: AgentExecutor,
  signal?: AbortSignal,
): Promise<BriefingResult> {
  const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });

  const [tasks, user] = await Promise.all([
    api.request<Task[]>('/api/tasks/today'),
    api.request<User>('/api/users/me'),
  ]);

  const { systemPrompt, userPrompt } = buildBriefingPrompt({
    user,
    tasks,
    persona: loadDefaultPersona(),
  });

  const result = await executor.run({
    systemPrompt,
    userPrompt,
    model: config.model,
    signal,
  });

  return { text: result.text, costUsd: result.costUsd, sessionId: result.sessionId };
}
