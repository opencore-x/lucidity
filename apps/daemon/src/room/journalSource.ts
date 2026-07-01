import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JournalQuery, JournalResult, JournalSource } from '@lucidity/runtime';
import type { JournalEntry } from '@lucidity/shared';

/**
 * Reads Lucid's agent journal from the vault session logs
 * (`<vault>/sessions/<stamp>-<kind>.md`, written by {@link import('../vault.js').Vault.writeSessionLog}).
 * Those markdown files carry the actual briefing / weekly-review TEXT, which is
 * what a person wants to read back on the phone — the `~/.lucidity/runs/*.jsonl`
 * records are metadata only (cost/status), so they are not the journal here.
 *
 * Newest-first, cursor-paginated: `before` is an ISO timestamp echoed from a
 * prior page's `nextBefore`, and only entries strictly older than it are
 * returned. The harness's `journal` capability delegates to this.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// `# {kind} — {createdAt ISO}` header written by writeSessionLog (em dash).
const HEADER_RE = /^#\s+(.+?)\s+—\s+(.+?)\s*$/m;
const MESSAGE_START = '## Message';
const FACTS_START = '## Facts learned';

// `<stamp>-<kind>.md`, e.g. `2026-07-02T08-00-00Z-briefing.md`.
const FILE_RE = /^(.+)-([a-z0-9-]+)\.md$/i;

function titleFor(kind: string): string {
  if (kind === 'briefing') return 'Briefing';
  if (kind === 'weekly-review') return 'Weekly review';
  const words = kind.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Session';
}

// Recover an ISO timestamp from a filename stamp (`2026-07-02T08-00-00Z`), the
// fallback when the header can't be parsed. Only the time part uses `-`.
function isoFromStamp(stamp: string): string {
  return stamp.replace(/T(\d{2})-(\d{2})-(\d{2})Z$/, 'T$1:$2:$3Z');
}

function parseEntry(file: string, content: string): JournalEntry | null {
  const fileMatch = FILE_RE.exec(file);
  if (!fileMatch) return null;
  const stamp = fileMatch[1] ?? file;
  const fileKind = fileMatch[2] ?? 'session';

  const header = HEADER_RE.exec(content);
  const kind = header?.[1]?.trim() || fileKind;
  const createdAt = header?.[2]?.trim() || isoFromStamp(stamp);

  let body = content;
  const msgIdx = content.indexOf(MESSAGE_START);
  if (msgIdx !== -1) {
    const afterHeading = content.indexOf('\n', msgIdx);
    const start = afterHeading === -1 ? content.length : afterHeading + 1;
    const factsIdx = content.indexOf(FACTS_START, start);
    body = content.slice(start, factsIdx === -1 ? undefined : factsIdx);
  }

  return { id: file, kind, title: titleFor(kind), body: body.trim(), createdAt };
}

export function createSessionJournalSource(sessionsDir: string): JournalSource {
  return {
    async read(query: JournalQuery = {}): Promise<JournalResult> {
      const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

      let files: string[];
      try {
        files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
      } catch {
        return { entries: [] }; // No sessions dir yet → empty journal.
      }

      const all: JournalEntry[] = [];
      for (const file of files) {
        try {
          const entry = parseEntry(file, readFileSync(join(sessionsDir, file), 'utf8'));
          if (entry) all.push(entry);
        } catch {
          // Skip an unreadable/malformed file rather than fail the whole read.
        }
      }

      all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      const filtered = query.before ? all.filter((e) => e.createdAt < query.before!) : all;

      const entries = filtered.slice(0, limit);
      const hasMore = filtered.length > limit;
      const nextBefore = hasMore ? entries[entries.length - 1]?.createdAt : undefined;
      return nextBefore ? { entries, nextBefore } : { entries };
    },
  };
}
