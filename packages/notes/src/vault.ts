import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  statSync,
  existsSync,
  type Dirent,
} from 'node:fs';
import {
  resolve,
  join,
  dirname,
  basename,
  relative,
  sep,
  isAbsolute,
} from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseFrontmatter, noteTitle } from '@lucidity/shared';

export type WriteMode = 'create' | 'append' | 'overwrite';

export interface NoteSummary {
  /** Path relative to the vault root, posix-style. */
  path: string;
  title: string;
  /** ISO 8601 last-modified time. */
  mtime: string;
}

export interface NoteContent extends NoteSummary {
  frontmatter: Record<string, unknown>;
  body: string;
  /** Raw file contents (frontmatter + body). */
  content: string;
}

export interface SearchHit {
  path: string;
  /** 1-based line number; 0 means the match was on the filename only. */
  line: number;
  snippet: string;
}

/**
 * Resolves a caller-supplied relative path to an absolute path *inside* the
 * vault, or throws. This is the security boundary for every read/write: it
 * rejects absolute paths, `..` traversal, and non-`.md` files. `resolve`
 * normalises `..` segments before the containment check, so `a/../../x.md`
 * is caught.
 */
export function resolveInVault(root: string, rel: string): string {
  if (typeof rel !== 'string' || rel.trim() === '') {
    throw new Error('note path is required');
  }
  if (isAbsolute(rel)) {
    throw new Error('note path must be relative to the vault');
  }
  const rootResolved = resolve(root);
  const target = resolve(rootResolved, rel);
  if (target !== rootResolved && !target.startsWith(rootResolved + sep)) {
    throw new Error('note path escapes the vault');
  }
  if (!target.toLowerCase().endsWith('.md')) {
    throw new Error('only .md files are allowed');
  }
  return target;
}

/** List notes (most-recently-modified first). Hidden dirs (.obsidian, .git, .trash) are skipped. */
export function listNotes(
  root: string,
  opts: { folder?: string; limit?: number } = {},
): NoteSummary[] {
  const limit = opts.limit ?? 50;
  const rootResolved = resolve(root);
  const base = opts.folder
    ? resolveDirInVault(rootResolved, opts.folder)
    : rootResolved;

  const files: string[] = [];
  walk(base, files);

  return files
    .map((f) => ({ f, mtime: safeMtimeMs(f) }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(({ f, mtime }) => ({
      path: toRel(rootResolved, f),
      title: titleFor(f),
      mtime: new Date(mtime).toISOString(),
    }));
}

export function readNote(root: string, rel: string): NoteContent {
  const rootResolved = resolve(root);
  const target = resolveInVault(rootResolved, rel);
  const content = readFileSync(target, 'utf8');
  const { data, body } = parseFrontmatter(content);
  return {
    path: toRel(rootResolved, target),
    title: noteTitle(content, basename(target)),
    frontmatter: data,
    body,
    content,
    mtime: new Date(safeMtimeMs(target)).toISOString(),
  };
}

/**
 * Write a note. `create` (default) refuses to clobber an existing note;
 * `append` adds to the end (creating the file if absent); `overwrite` replaces
 * it. All modes write atomically (temp file + rename) so a crash mid-write can
 * never leave a half-written note — important because there is no undo and the
 * file syncs to other devices.
 */
export function writeNote(
  root: string,
  rel: string,
  content: string,
  mode: WriteMode = 'create',
): NoteSummary {
  const rootResolved = resolve(root);
  const target = resolveInVault(rootResolved, rel);
  const exists = existsSync(target);

  if (mode === 'create' && exists) {
    throw new Error(
      `note already exists: ${toRel(rootResolved, target)} (use mode "append" or "overwrite")`,
    );
  }

  let next = content;
  if (mode === 'append' && exists) {
    const prev = readFileSync(target, 'utf8');
    next =
      prev === '' || prev.endsWith('\n')
        ? prev + content
        : `${prev}\n${content}`;
  }

  atomicWrite(target, next);
  return {
    path: toRel(rootResolved, target),
    title: noteTitle(next, basename(target)),
    mtime: new Date(safeMtimeMs(target)).toISOString(),
  };
}

/**
 * Surgically replace an exact span inside an existing note, leaving the rest of
 * the file byte-for-byte intact — the safe alternative to an `overwrite` for
 * mid-file edits (no whole-file reflow, no dropped content, no mangled
 * frontmatter). Mirrors Claude Code's `Edit`: `oldString` must be present, and
 * unique unless `replaceAll`. Writes atomically (temp + rename), same as
 * {@link writeNote}.
 */
export function editNote(
  root: string,
  rel: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): NoteSummary {
  const rootResolved = resolve(root);
  const target = resolveInVault(rootResolved, rel);

  if (typeof oldString !== 'string' || oldString === '') {
    throw new Error('oldString is required');
  }
  if (oldString === newString) {
    throw new Error('oldString and newString are identical');
  }
  if (!existsSync(target)) {
    throw new Error(`note not found: ${toRel(rootResolved, target)}`);
  }

  const prev = readFileSync(target, 'utf8');
  const count = countOccurrences(prev, oldString);
  if (count === 0) {
    throw new Error(`oldString not found in ${toRel(rootResolved, target)}`);
  }
  if (count > 1 && !replaceAll) {
    throw new Error(
      `oldString is not unique in ${toRel(rootResolved, target)} (${count} matches) — ` +
        'add surrounding context to make it unique, or pass replaceAll',
    );
  }

  // Index-based splice (not String.replace) so `$`-sequences in newString are
  // inserted literally and the untouched bytes stay exactly as they were.
  let next: string;
  if (replaceAll) {
    next = prev.split(oldString).join(newString);
  } else {
    const idx = prev.indexOf(oldString);
    next = prev.slice(0, idx) + newString + prev.slice(idx + oldString.length);
  }

  atomicWrite(target, next);
  return {
    path: toRel(rootResolved, target),
    title: noteTitle(next, basename(target)),
    mtime: new Date(safeMtimeMs(target)).toISOString(),
  };
}

/** Naive case-insensitive substring search over filenames + bodies. No index. */
export function searchNotes(
  root: string,
  query: string,
  opts: { limit?: number } = {},
): SearchHit[] {
  const limit = opts.limit ?? 20;
  const q = query.toLowerCase();
  if (q.trim() === '') return [];

  const rootResolved = resolve(root);
  const files: string[] = [];
  walk(rootResolved, files);
  files.sort((a, b) => safeMtimeMs(b) - safeMtimeMs(a));

  const hits: SearchHit[] = [];
  for (const f of files) {
    if (hits.length >= limit) break;
    const rel = toRel(rootResolved, f);
    let raw: string;
    try {
      raw = readFileSync(f, 'utf8');
    } catch {
      continue;
    }

    const lines = raw.split(/\r?\n/);
    let matchedBody = false;
    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= limit) break;
      const line = lines[i];
      if (line === undefined) continue;
      if (line.toLowerCase().includes(q)) {
        hits.push({
          path: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 200),
        });
        matchedBody = true;
      }
    }
    if (!matchedBody && rel.toLowerCase().includes(q) && hits.length < limit) {
      hits.push({ path: rel, line: 0, snippet: titleFor(f) });
    }
  }
  return hits;
}

/**
 * A small, bounded digest of the most-recent notes (title + path), for weaving
 * into daemon briefing/chat prompts. Bounded by `limit` (count) and `maxBytes`
 * so it can never blow up the prompt.
 */
export function readNotesContext(
  root: string,
  opts: { limit?: number; maxBytes?: number } = {},
): string {
  const limit = opts.limit ?? 15;
  const maxBytes = opts.maxBytes ?? 2048;

  const lines: string[] = [];
  let bytes = 0;
  for (const n of listNotes(root, { limit })) {
    const line = `- ${n.title} (${n.path})`;
    bytes += Buffer.byteLength(line, 'utf8') + 1;
    if (bytes > maxBytes) break;
    lines.push(line);
  }
  return lines.join('\n');
}

// ----- internals -----

function resolveDirInVault(rootResolved: string, rel: string): string {
  if (isAbsolute(rel)) throw new Error('folder must be relative to the vault');
  const target = resolve(rootResolved, rel);
  if (target !== rootResolved && !target.startsWith(rootResolved + sep)) {
    throw new Error('folder escapes the vault');
  }
  return target;
}

function walk(dir: string, acc: string[]): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip .obsidian, .git, .trash, dot-temp
    if (e.isSymbolicLink()) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) acc.push(full);
  }
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

function atomicWrite(target: string, data: string): void {
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${basename(target)}.${randomUUID()}.tmp`);
  writeFileSync(tmp, data, 'utf8');
  renameSync(tmp, target);
}

function toRel(rootResolved: string, full: string): string {
  return relative(rootResolved, full).split(sep).join('/');
}

function safeMtimeMs(f: string): number {
  try {
    return statSync(f).mtimeMs;
  } catch {
    return 0;
  }
}

function titleFor(f: string): string {
  try {
    return noteTitle(readFileSync(f, 'utf8'), basename(f));
  } catch {
    return basename(f).replace(/\.md$/i, '');
  }
}
