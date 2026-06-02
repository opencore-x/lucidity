import type { Task, User } from '@lucidity/shared';

export interface BuildBriefingPromptInput {
  /** The person being briefed. Only name/email are read. */
  user: Pick<User, 'name' | 'email'>;
  /** Tasks due today or overdue (e.g. from `GET /api/tasks/today`). */
  tasks: Task[];
  /** Persona/system text (e.g. `loadDefaultPersona()`). */
  persona: string;
  /**
   * Reference "now" used for the date header and overdue detection. Defaults to
   * the current time; pass a fixed value for deterministic tests/snapshots.
   */
  now?: Date;
  /** Durable facts (MEMORY.md). Woven into the prompt when provided. */
  memory?: string;
  /** Bounded recent-notes digest from the notes vault. Woven in when provided. */
  notes?: string;
}

export interface BriefingPrompt {
  /** Goes to `claude -p --append-system-prompt`. */
  systemPrompt: string;
  /** Goes to `claude -p "<userPrompt>"`. */
  userPrompt: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** API responses serialize dates to ISO strings; tolerate Date | string | null. */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDay(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function describeTask(task: Task, today: Date): string {
  const due = toDate(task.dueDate);
  let when: string;
  if (!due) {
    when = 'no due date';
  } else if (startOfDay(due) < today) {
    when = `overdue (was due ${formatDay(due)})`;
  } else {
    when = 'due today';
  }
  // priority: 1–1000, lower = more urgent. Flag the sharp end only.
  const urgent = typeof task.priority === 'number' && task.priority <= 250 ? ', high priority' : '';
  return `- ${task.title} — ${when}${urgent}`;
}

/**
 * Assembles the daily-briefing prompt. Pure: no I/O, no clock reads beyond the
 * optional `now`. Kept deliberately lean (one system prompt + one user prompt).
 */
export function buildBriefingPrompt(input: BuildBriefingPromptInput): BriefingPrompt {
  const { user, tasks, persona, memory, notes } = input;
  const now = input.now ?? new Date();
  const today = startOfDay(now);
  const name = user.name?.trim() || 'there';

  const systemPrompt = [
    persona,
    '---',
    `You are writing a daily briefing for ${name}. It will be delivered as a short`,
    'notification/message. Be concise and specific. Use only the facts in the user',
    'message — never invent tasks, counts, or dates. Plain text, no markdown headings.',
  ].join('\n');

  const lines: string[] = [];
  lines.push(`${greeting(now)}, ${name}.`);
  lines.push('');
  lines.push(`Today is ${formatDay(now)}.`);
  lines.push('');

  if (tasks.length === 0) {
    lines.push('Nothing is due today and nothing is overdue.');
  } else {
    const noun = tasks.length === 1 ? 'task' : 'tasks';
    lines.push(`${tasks.length} ${noun} due today or overdue, most urgent first:`);
    lines.push('');
    for (const task of tasks) {
      lines.push(describeTask(task, today));
    }
  }

  if (memory) {
    lines.push('');
    lines.push('What you remember about them:');
    lines.push(memory.trim());
  }

  if (notes) {
    lines.push('');
    lines.push('Recent notes from their vault:');
    lines.push(notes.trim());
  }

  lines.push('');
  lines.push(
    tasks.length === 0
      ? 'Write a brief, warm note acknowledging the clear plate. One or two sentences.'
      : 'Write the briefing: a short greeting, then call out what to focus on first and why. Two or three sentences, plus the top one or two tasks if it helps. No headings.',
  );

  return { systemPrompt, userPrompt: lines.join('\n') };
}
