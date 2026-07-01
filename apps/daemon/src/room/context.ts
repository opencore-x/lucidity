import { createApiClient } from '@lucidity/runtime';
import type { Task, User } from '@lucidity/shared';
import type { DaemonConfig } from '../config.js';
import type { Vault } from '../vault.js';
import { loadNotesContext } from '../notesContext.js';

/**
 * Per-request context gatherers for the room client. The harness bakes in the
 * persona at construction; everything else (who the user is, durable memory, a
 * recent-notes digest, a task snapshot) is assembled here per turn, mirroring
 * the chat server's turn-1 build and the briefing job. All API reads are
 * best-effort: offline → Lucid still answers, just with less context.
 */

export interface AskContext {
  user: Pick<User, 'name'>;
  memory?: string;
  notes?: string;
  context?: string;
}

export interface BriefingContext {
  user: Pick<User, 'name' | 'email'>;
  tasks: Task[];
  memory?: string;
  notes?: string;
}

function memoryFrom(vault: Vault): string | undefined {
  const facts = vault.readMemoryFacts();
  return facts.length ? facts.map((f) => `- ${f}`).join('\n') : undefined;
}

export async function loadAskContext(config: DaemonConfig, vault: Vault): Promise<AskContext> {
  const memory = memoryFrom(vault);
  const notes = loadNotesContext(config);
  let name = '';
  let context: string | undefined;
  try {
    const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });
    const [tasks, user] = await Promise.all([
      api.request<Task[]>('/api/tasks/today').catch(() => [] as Task[]),
      api.request<User>('/api/users/me'),
    ]);
    name = user.name ?? '';
    const titles = tasks.map((t) => t.title).filter(Boolean);
    if (titles.length) context = `Today/overdue tasks: ${titles.join('; ')}`;
  } catch {
    // Offline / API down → answer without live task context.
  }
  return { user: { name }, memory, notes, context };
}

export async function loadBriefingContext(config: DaemonConfig, vault: Vault): Promise<BriefingContext> {
  const memory = memoryFrom(vault);
  const notes = loadNotesContext(config);
  let user: Pick<User, 'name' | 'email'> = { name: '', email: '' };
  let tasks: Task[] = [];
  try {
    const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });
    const [todayTasks, me] = await Promise.all([
      api.request<Task[]>('/api/tasks/today'),
      api.request<User>('/api/users/me'),
    ]);
    tasks = todayTasks;
    user = { name: me.name ?? '', email: me.email ?? '' };
  } catch {
    // Offline / API down → briefing still generates, just with no live tasks.
  }
  return { user, tasks, memory, notes };
}
