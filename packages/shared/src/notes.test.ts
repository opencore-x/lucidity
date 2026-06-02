import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, noteTitle } from './notes.js';

test('parseFrontmatter: no frontmatter returns opaque body', () => {
  const raw = '# Hello\n\nbody';
  const { data, body } = parseFrontmatter(raw);
  assert.deepEqual(data, {});
  assert.equal(body, raw);
});

test('parseFrontmatter: parses scalars, block lists, inline arrays', () => {
  const raw = '---\ntitle: My Note\ntags:\n  - a\n  - b\naliases: [x, y]\npinned: true\n---\nbody here';
  const { data, body } = parseFrontmatter(raw);
  assert.equal(data['title'], 'My Note');
  assert.deepEqual(data['tags'], ['a', 'b']);
  assert.deepEqual(data['aliases'], ['x', 'y']);
  assert.equal(data['pinned'], true);
  assert.equal(body, 'body here');
});

test('parseFrontmatter: keeps date-like values as strings', () => {
  const { data } = parseFrontmatter('---\ndue: 2026-06-02\n---\nx');
  assert.equal(data['due'], '2026-06-02');
});

test('parseFrontmatter: empty frontmatter block yields empty data', () => {
  const { data, body } = parseFrontmatter('---\n---\nbody');
  assert.deepEqual(data, {});
  assert.equal(body, 'body');
});

test('parseFrontmatter: unterminated frontmatter falls back to opaque', () => {
  const raw = '---\nthis is not closed\n\n# heading';
  const { data, body } = parseFrontmatter(raw);
  assert.deepEqual(data, {});
  assert.equal(body, raw);
});

test('noteTitle: frontmatter title wins over H1', () => {
  assert.equal(noteTitle('---\ntitle: FM Title\n---\n# H1 Title\nx', 'file.md'), 'FM Title');
});

test('noteTitle: falls back to first H1', () => {
  assert.equal(noteTitle('# H1 Title\n\nbody', 'file.md'), 'H1 Title');
});

test('noteTitle: falls back to filename without extension', () => {
  assert.equal(noteTitle('just body, no heading', 'My File.md'), 'My File');
});
