const HEADER = '# What Lucid remembers';

/**
 * Extracts bullet facts ("- …" / "* …") from arbitrary text — used both for
 * reflection model output and for reading `MEMORY.md`. Ignores headings, blank
 * lines, and a lone "NONE" sentinel.
 */
export function parseFacts(text: string): string[] {
  const facts: string[] = [];
  for (const raw of text.split('\n')) {
    const bullet = /^[-*]\s+(.*)$/.exec(raw.trim());
    if (!bullet) continue; // only bullet lines are facts (ignores headings, prose, NONE, placeholders)
    const fact = (bullet[1] ?? '').trim();
    if (fact && !/^none$/i.test(fact)) facts.push(fact);
  }
  return facts;
}

/**
 * Merges durable facts: case-insensitive dedupe (keeping the first phrasing and
 * original order), then caps to the most-recent `cap` (incoming are appended,
 * so the cap keeps the newest). Never clobbers — only grows/trims.
 */
export function mergeFacts(existing: string[], incoming: string[], cap = 50): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const f of [...existing, ...incoming]) {
    const fact = f.trim();
    const key = fact.toLowerCase();
    if (!fact || seen.has(key)) continue;
    seen.add(key);
    merged.push(fact);
  }
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

/** Renders facts to a stable `MEMORY.md` body. */
export function renderMemoryFile(facts: string[]): string {
  const body = facts.length ? facts.map((f) => `- ${f}`).join('\n') : '_(nothing yet)_';
  return `${HEADER}\n\n${body}\n`;
}
