import type { Task, User } from '@lucidity/shared';

/** Shape of `GET /api/tasks/stats`. */
export interface WeeklyReviewStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  deferred: number;
  overdue: number;
}

export interface BuildWeeklyReviewPromptInput {
  user: Pick<User, 'name' | 'email'>;
  /** Tasks due this week (e.g. from `GET /api/tasks/week`). */
  tasks: Task[];
  stats: WeeklyReviewStats;
  persona: string;
  /** Reference "now"; defaults to the current time. Pass a fixed value for tests. */
  now?: Date;
  /** Reserved memory seam (MEMORY.md facts). */
  memory?: string;
}

export interface WeeklyReviewPrompt {
  systemPrompt: string;
  userPrompt: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDay(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function describeTask(task: Task): string {
  const due = toDate(task.dueDate);
  return `- ${task.title} — ${due ? `due ${formatDay(due)}` : 'no due date'}`;
}

/**
 * Assembles the weekly-review prompt: a calm look at the week from the user's
 * week tasks + aggregate stats. Pure; lean. Distinct from the daily briefing
 * (reflective, week-scoped, stats-aware).
 */
export function buildWeeklyReviewPrompt(input: BuildWeeklyReviewPromptInput): WeeklyReviewPrompt {
  const { user, tasks, stats, persona, memory } = input;
  const name = user.name?.trim() || 'there';

  const systemPrompt = [
    persona,
    '---',
    `You are writing a weekly review for ${name}: a calm look at the week ahead. Be concise,`,
    'specific, and encouraging without flattery. Use only the facts in the user message — never',
    'invent tasks, counts, or dates. Plain text, no markdown headings.',
  ].join('\n');

  const lines: string[] = [];
  lines.push(`Weekly review for ${name}.`);
  lines.push('');
  lines.push(
    `Open tasks: ${stats.total} · overdue: ${stats.overdue} · in progress: ${stats.inProgress} · completed: ${stats.completed}.`,
  );
  lines.push('');

  if (tasks.length === 0) {
    lines.push('Nothing is due in the week ahead.');
  } else {
    const noun = tasks.length === 1 ? 'task' : 'tasks';
    lines.push(`${tasks.length} ${noun} due this week:`);
    lines.push('');
    for (const task of tasks) lines.push(describeTask(task));
  }

  if (memory) {
    lines.push('');
    lines.push('What you remember about them:');
    lines.push(memory.trim());
  }

  lines.push('');
  lines.push(
    'Write the weekly review: how the week looks, what deserves focus and why, and any pattern worth naming. Two or three short paragraphs. No headings.',
  );

  return { systemPrompt, userPrompt: lines.join('\n') };
}
