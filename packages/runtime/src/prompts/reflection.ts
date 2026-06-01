import type { Task, User } from '@lucidity/shared';

export interface BuildMemoryReflectionPromptInput {
  /** Persona/system text (SOUL.md or the packaged default). */
  persona: string;
  user: Pick<User, 'name'>;
  /** Today's tasks (for context — only titles are used). */
  tasks: Task[];
  /** The briefing just delivered. */
  briefing: string;
  /** Current durable facts (MEMORY.md contents). */
  memory?: string;
}

export interface ReflectionPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Assembles the post-briefing reflection prompt: asks Lucid for ONLY new,
 * durable facts about the user, one per line ("- …") or the literal `NONE`.
 * Pure; intentionally lean. Parse the result with `parseFacts` and merge with
 * `mergeFacts`.
 */
export function buildMemoryReflectionPrompt(input: BuildMemoryReflectionPromptInput): ReflectionPrompt {
  const { persona, user, tasks, briefing, memory } = input;
  const name = user.name?.trim() || 'the user';

  const systemPrompt = [
    persona,
    '---',
    `You maintain a small, durable memory file about ${name}. Note ONLY new facts worth`,
    'remembering for months: stable preferences, recurring patterns, ongoing projects, working',
    'style. Ignore one-off task details and anything already in the existing memory.',
    'Output ONLY a list, one fact per line starting with "- ". Keep each fact short and concrete.',
    'If there is nothing new worth remembering, output exactly: NONE',
  ].join('\n');

  const titles = tasks.map((t) => t.title).filter(Boolean).join('; ');
  const userPrompt = [
    `Existing memory about ${name}:`,
    (memory && memory.trim()) || '(empty)',
    '',
    `Today's tasks: ${titles || '(none)'}`,
    '',
    'The briefing you just delivered:',
    briefing.trim(),
    '',
    'What new durable facts (if any) should be added to memory?',
  ].join('\n');

  return { systemPrompt, userPrompt };
}
