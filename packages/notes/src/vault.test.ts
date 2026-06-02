import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveInVault,
  listNotes,
  readNote,
  writeNote,
  searchNotes,
  readNotesContext,
} from './vault.js';

function withVault(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'lucidity-notes-'));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('resolveInVault rejects traversal, absolute, and non-md paths', () => {
  withVault((root) => {
    assert.throws(() => resolveInVault(root, '../escape.md'), /escape/);
    assert.throws(() => resolveInVault(root, 'sub/../../x.md'), /escape/);
    assert.throws(() => resolveInVault(root, '/etc/passwd.md'), /relative/);
    assert.throws(() => resolveInVault(root, 'notes.txt'), /\.md/);
    assert.throws(() => resolveInVault(root, ''), /required/);

    const ok = resolveInVault(root, 'folder/note.md');
    assert.ok(ok.endsWith(join('folder', 'note.md')));
    assert.ok(ok.startsWith(root));
  });
});

test('writeNote: create refuses to clobber; append + overwrite work; no temp files left', () => {
  withVault((root) => {
    writeNote(root, 'a.md', '# A\nhello');
    assert.equal(readNote(root, 'a.md').content, '# A\nhello');

    assert.throws(() => writeNote(root, 'a.md', 'x'), /already exists/);

    writeNote(root, 'a.md', 'more', 'append');
    assert.equal(readNote(root, 'a.md').content, '# A\nhello\nmore');

    writeNote(root, 'a.md', 'fresh', 'overwrite');
    assert.equal(readNote(root, 'a.md').content, 'fresh');

    // append to a non-existent note creates it
    writeNote(root, 'sub/b.md', 'b body', 'append');
    assert.equal(readNote(root, 'sub/b.md').content, 'b body');

    // atomic writes leave no .tmp residue
    assert.ok(!readdirSync(root).some((n) => n.includes('.tmp')));
  });
});

test('listNotes returns .md and skips hidden dirs; titles resolve', () => {
  withVault((root) => {
    writeNote(root, 'one.md', '# One');
    writeNote(root, 'two.md', '---\ntitle: Second\n---\nbody');
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    writeFileSync(join(root, '.obsidian', 'config.md'), '# hidden');

    const notes = listNotes(root);
    const paths = notes.map((n) => n.path);
    assert.ok(paths.includes('one.md'));
    assert.ok(paths.includes('two.md'));
    assert.ok(!paths.some((p) => p.includes('.obsidian')));
    assert.equal(notes.find((n) => n.path === 'one.md')?.title, 'One');
    assert.equal(notes.find((n) => n.path === 'two.md')?.title, 'Second');
  });
});

test('searchNotes finds case-insensitive matches with line numbers', () => {
  withVault((root) => {
    writeNote(root, 'x.md', '# Title\nThe Quick Brown Fox');
    writeNote(root, 'y.md', '# Other\nnothing here');

    const hits = searchNotes(root, 'quick brown');
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.path, 'x.md');
    assert.equal(hits[0]?.line, 2);
    assert.ok(hits[0]?.snippet.toLowerCase().includes('quick brown'));
  });
});

test('readNotesContext is bounded by limit and bytes', () => {
  withVault((root) => {
    for (let i = 0; i < 20; i++) writeNote(root, `n${i}.md`, `# Note ${i}`);

    const five = readNotesContext(root, { limit: 5, maxBytes: 10_000 });
    assert.equal(five.split('\n').length, 5);

    const tiny = readNotesContext(root, { limit: 20, maxBytes: 30 });
    assert.ok(tiny.split('\n').length < 5);
  });
});
