import { Paths, File, Directory } from 'expo-file-system';
import { parseFrontmatter, noteTitle } from '@lucidity/shared';
import type { NotesBackend, NoteSummary, NoteContent, SearchHit, WriteMode } from './types';

/**
 * Dev/stub backend: a "Lucidity" folder in the app's own document directory.
 * Real `.md` files, real read/write — just the app sandbox instead of the
 * iCloud container. Lets the browser + editor run in the dev client today.
 * (Writes here are direct, not coordinated; the iCloud module adds atomic +
 * NSFileCoordinator semantics.)
 */
const VAULT_DIR_NAME = 'Lucidity';

function vaultRoot(): Directory {
  const dir = new Directory(Paths.document, VAULT_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true });
    seedWelcome(dir);
  }
  return dir;
}

/** First-run seed so the browser has something to show before iCloud lands. */
function seedWelcome(dir: Directory): void {
  try {
    const file = new File(dir, 'Welcome.md');
    file.create();
    file.write(
      '# Welcome to Lucidity Notes\n\n' +
        'These are plain `.md` files in your local vault — the same files Claude can read and edit.\n\n' +
        '- Tap a note to open it\n' +
        '- Markdown renders here\n' +
        '- Once iCloud is set up, this becomes your synced **Lucidity** vault\n',
    );
  } catch {
    // seeding is best-effort
  }
}

function relSegments(rel: string): string[] {
  const trimmed = rel.trim();
  if (!trimmed) throw new Error('note path is required');
  if (trimmed.startsWith('/') || trimmed.includes('..')) {
    throw new Error('note path escapes the vault');
  }
  if (!trimmed.toLowerCase().endsWith('.md')) {
    throw new Error('only .md files are allowed');
  }
  return trimmed.split('/').filter(Boolean);
}

function fileFor(rel: string): File {
  return new File(vaultRoot(), ...relSegments(rel));
}

function walk(dir: Directory, prefix: string, out: { file: File; rel: string }[]): void {
  for (const entry of dir.list()) {
    if (entry.name.startsWith('.')) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry instanceof Directory) {
      walk(entry, rel, out);
    } else if (entry instanceof File && entry.name.toLowerCase().endsWith('.md')) {
      out.push({ file: entry, rel });
    }
  }
}

function summarize(file: File, rel: string): NoteSummary {
  let title = file.name.replace(/\.md$/i, '');
  try {
    title = noteTitle(file.textSync(), file.name);
  } catch {
    // keep filename fallback
  }
  return { path: rel, title, modifiedAt: file.lastModified ?? 0 };
}

export const sandboxBackend: NotesBackend = {
  async list(opts) {
    const found: { file: File; rel: string }[] = [];
    walk(vaultRoot(), '', found);
    found.sort((a, b) => (b.file.lastModified ?? 0) - (a.file.lastModified ?? 0));
    return found.slice(0, opts?.limit ?? 100).map(({ file, rel }) => summarize(file, rel));
  },

  async read(path) {
    const file = fileFor(path);
    if (!file.exists) throw new Error(`note not found: ${path}`);
    const content = file.textSync();
    const { data, body } = parseFrontmatter(content);
    return {
      path,
      title: noteTitle(content, file.name),
      modifiedAt: file.lastModified ?? 0,
      frontmatter: data,
      body,
      content,
    };
  },

  async write(path, content, mode: WriteMode = 'create') {
    const file = fileFor(path);
    const exists = file.exists;
    if (mode === 'create' && exists) {
      throw new Error(`note already exists: ${path} (use mode "append" or "overwrite")`);
    }
    const parent = file.parentDirectory;
    if (!parent.exists) parent.create({ intermediates: true });

    let next = content;
    if (mode === 'append' && exists) {
      const prev = file.textSync();
      next = prev === '' || prev.endsWith('\n') ? prev + content : `${prev}\n${content}`;
    }
    if (!exists) file.create();
    file.write(next);
    return summarize(file, path);
  },

  async edit(path, oldString, newString, replaceAll = false) {
    const file = fileFor(path);
    if (!file.exists) throw new Error(`note not found: ${path}`);
    const content = file.textSync();
    const count = content.split(oldString).length - 1;
    if (count === 0) throw new Error('old text not found in note');
    if (!replaceAll && count > 1) throw new Error('old text is not unique; add more context');
    const next = replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
    file.write(next);
    return summarize(file, path);
  },

  async search(query, opts) {
    const q = query.toLowerCase();
    if (!q.trim()) return [];
    const found: { file: File; rel: string }[] = [];
    walk(vaultRoot(), '', found);
    found.sort((a, b) => (b.file.lastModified ?? 0) - (a.file.lastModified ?? 0));

    const hits: SearchHit[] = [];
    const limit = opts?.limit ?? 20;
    for (const { file, rel } of found) {
      if (hits.length >= limit) break;
      let raw = '';
      try {
        raw = file.textSync();
      } catch {
        continue;
      }
      const lines = raw.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (hits.length >= limit) break;
        const line = lines[i];
        if (line && line.toLowerCase().includes(q)) {
          hits.push({ path: rel, line: i + 1, snippet: line.trim().slice(0, 200) });
        }
      }
    }
    return hits;
  },
};
