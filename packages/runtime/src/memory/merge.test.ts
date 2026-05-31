import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFacts, mergeFacts, renderMemoryFile } from './merge.js';

test('parseFacts extracts bullets, ignoring headings/blanks/NONE', () => {
  const text = '# What Lucid remembers\n\n- Prefers mornings\n* Uses Linux\n\nNONE';
  assert.deepEqual(parseFacts(text), ['Prefers mornings', 'Uses Linux']);
});

test('parseFacts returns [] for a NONE-only reflection', () => {
  assert.deepEqual(parseFacts('NONE'), []);
  assert.deepEqual(parseFacts('  none  '), []);
});

test('mergeFacts dedupes case-insensitively, preserving first phrasing + order', () => {
  const merged = mergeFacts(['Prefers mornings', 'Uses Linux'], ['prefers MORNINGS', 'Likes tea']);
  assert.deepEqual(merged, ['Prefers mornings', 'Uses Linux', 'Likes tea']);
});

test('mergeFacts caps to the most-recent N', () => {
  const existing = ['a', 'b', 'c'];
  const incoming = ['d', 'e'];
  assert.deepEqual(mergeFacts(existing, incoming, 3), ['c', 'd', 'e']);
});

test('renderMemoryFile + parseFacts round-trip', () => {
  const facts = ['Prefers mornings', 'Ships small PRs'];
  const md = renderMemoryFile(facts);
  assert.ok(md.startsWith('# What Lucid remembers'));
  assert.deepEqual(parseFacts(md), facts);
});

test('renderMemoryFile handles the empty case', () => {
  const md = renderMemoryFile([]);
  assert.ok(md.includes('_(nothing yet)_'));
  assert.deepEqual(parseFacts(md), []);
});
