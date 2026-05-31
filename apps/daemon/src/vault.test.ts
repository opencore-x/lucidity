import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createVault } from './vault.js';

function withVault(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-vault-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('readPersona seeds SOUL.md from the packaged default when absent', () => {
  withVault((dir) => {
    const persona = createVault(dir).readPersona();
    assert.ok(persona.length > 0);
    assert.ok(existsSync(join(dir, 'SOUL.md')));
    assert.ok(readFileSync(join(dir, 'SOUL.md'), 'utf8').includes(persona.slice(0, 16)));
  });
});

test('readPersona prefers an existing SOUL.md override', () => {
  withVault((dir) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SOUL.md'), 'CUSTOM SOUL', 'utf8');
    assert.equal(createVault(dir).readPersona(), 'CUSTOM SOUL');
  });
});

test('memory facts round-trip through MEMORY.md', () => {
  withVault((dir) => {
    const v = createVault(dir);
    assert.deepEqual(v.readMemoryFacts(), []);
    v.writeMemoryFacts(['Prefers mornings', 'Ships small PRs']);
    assert.ok(readFileSync(join(dir, 'MEMORY.md'), 'utf8').startsWith('# What Lucid remembers'));
    assert.deepEqual(v.readMemoryFacts(), ['Prefers mornings', 'Ships small PRs']);
  });
});

test('writeSessionLog writes a readable session file', () => {
  withVault((dir) => {
    createVault(dir).writeSessionLog({
      startedAt: '2026-06-01T02:30:00.000Z',
      briefing: 'Good morning. Pay the cards.',
      deliveredVia: 'macos',
      factsLearned: ['Likes tea'],
    });
    const files = readdirSync(join(dir, 'sessions'));
    assert.equal(files.length, 1);
    const file = files[0];
    assert.ok(file);
    const content = readFileSync(join(dir, 'sessions', file), 'utf8');
    assert.ok(content.includes('Good morning. Pay the cards.'));
    assert.ok(content.includes('Likes tea'));
    assert.ok(content.includes('macos'));
  });
});
