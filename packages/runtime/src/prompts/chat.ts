import type { User } from '@lucidity/shared';

export interface BuildChatSystemPromptInput {
  /** Persona/system text (SOUL.md or the packaged default). */
  persona: string;
  user: Pick<User, 'name'>;
  /** Durable facts (MEMORY.md bullet list). */
  memory?: string;
  /** Optional extra session context, e.g. a snapshot of today's tasks. */
  context?: string;
}

/**
 * Assembles the system prompt for an interactive chat session with Lucid. Set
 * once at session start (`--session-id` + `--append-system-prompt`); per-turn
 * user messages need no assembly. Pure. Distinct from the briefing framing —
 * this is conversational, not a one-shot summary.
 */
export function buildChatSystemPrompt(input: BuildChatSystemPromptInput): string {
  const { persona, user, memory, context } = input;
  const name = user.name?.trim() || 'the user';

  const parts = [
    persona,
    '---',
    `You are in a live, back-and-forth conversation with ${name}. Reply like a thoughtful person:`,
    'concise, direct, conversational. Use what you remember and any context below; never invent tasks,',
    'counts, or dates. If you do not know something, say so plainly.',
  ];

  if (memory && memory.trim()) {
    parts.push('', `What you remember about ${name}:`, memory.trim());
  }
  if (context && context.trim()) {
    parts.push('', 'Context for this session:', context.trim());
  }

  return parts.join('\n');
}
