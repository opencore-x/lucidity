import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSessionJournalSource } from './journalSource.js';

/** Build a session markdown file exactly as vault.writeSessionLog does. */
function sessionFile(kind: string, startedAt: string, body: string, facts: string[] = []): { name: string; content: string } {
  const stamp = startedAt.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  const factsBlock = facts.length ? facts.map((f) => `- ${f}`).join('\n') : '_(none)_';
  const content =
    `# ${kind} — ${startedAt}\n\n` +
    `Delivered via: macos\n\n` +
    `## Message\n\n${body}\n\n` +
    `## Facts learned\n\n${factsBlock}\n`;
  return { name: `${stamp}-${kind}.md`, content };
}

function withSessionsDir(files: Array<{ name: string; content: string }>): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-journal-'));
  const sessions = join(dir, 'sessions');
  mkdirSync(sessions, { recursive: true });
  for (const f of files) writeFileSync(join(sessions, f.name), f.content, 'utf8');
  return { dir: sessions, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('reads session logs newest-first with parsed kind/title/body/createdAt', async () => {
  const { dir, cleanup } = withSessionsDir([
    sessionFile('briefing', '2026-07-01T08:00:00.000Z', 'Older briefing body.'),
    sessionFile('weekly-review', '2026-07-02T18:00:00.000Z', 'Weekly review body.', ['learned a thing']),
    sessionFile('briefing', '2026-07-02T08:00:00.000Z', 'Newer briefing body.'),
  ]);
  try {
    const source = createSessionJournalSource(dir);
    const { entries, nextBefore } = await source.read({});

    assert.equal(entries.length, 3);
    assert.deepEqual(
      entries.map((e) => e.createdAt),
      ['2026-07-02T18:00:00.000Z', '2026-07-02T08:00:00.000Z', '2026-07-01T08:00:00.000Z'],
    );
    const [first, second] = entries;
    assert.ok(first && second);
    assert.equal(first.kind, 'weekly-review');
    assert.equal(first.title, 'Weekly review');
    assert.equal(first.body, 'Weekly review body.');
    assert.equal(second.title, 'Briefing');
    assert.equal(second.body, 'Newer briefing body.');
    // Body excludes the "Facts learned" section.
    assert.ok(!first.body.includes('learned a thing'));
    assert.equal(nextBefore, undefined); // all returned, no more pages
  } finally {
    cleanup();
  }
});

test('paginates with limit + before cursor', async () => {
  const { dir, cleanup } = withSessionsDir([
    sessionFile('briefing', '2026-07-01T08:00:00.000Z', 'A'),
    sessionFile('briefing', '2026-07-02T08:00:00.000Z', 'B'),
    sessionFile('briefing', '2026-07-03T08:00:00.000Z', 'C'),
  ]);
  try {
    const source = createSessionJournalSource(dir);

    const page1 = await source.read({ limit: 2 });
    assert.deepEqual(page1.entries.map((e) => e.body), ['C', 'B']);
    assert.equal(page1.nextBefore, '2026-07-02T08:00:00.000Z');

    const page2 = await source.read({ limit: 2, before: page1.nextBefore });
    assert.deepEqual(page2.entries.map((e) => e.body), ['A']);
    assert.equal(page2.nextBefore, undefined);
  } finally {
    cleanup();
  }
});

test('returns an empty journal when the sessions dir is absent', async () => {
  const source = createSessionJournalSource(join(tmpdir(), 'lucid-journal-does-not-exist-xyz'));
  const { entries, nextBefore } = await source.read({});
  assert.deepEqual(entries, []);
  assert.equal(nextBefore, undefined);
});
