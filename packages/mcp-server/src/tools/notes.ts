import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { listNotes, readNote, writeNote, searchNotes } from '@lucidity/notes';

function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p;
}

/** Resolved vault path from env, or null when notes aren't configured. */
function getVaultPath(): string | null {
  const p = process.env['LUCIDITY_NOTES_PATH'];
  return p && p.trim() ? expandHome(p.trim()) : null;
}

function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }] };
}

/**
 * Runs `fn` against the configured vault, turning a missing config or any
 * filesystem/validation error into a plain text message rather than crashing
 * the server — so the task tools keep working even when notes aren't set up.
 */
async function withVault(fn: (root: string) => string | Promise<string>) {
  const root = getVaultPath();
  if (!root) {
    return text(
      'Notes are not configured. Set the LUCIDITY_NOTES_PATH environment variable ' +
        'to your markdown vault folder and restart the MCP server.',
    );
  }
  try {
    return text(await fn(root));
  } catch (err) {
    return text(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function registerNoteTools(server: McpServer) {
  server.tool(
    'list_notes',
    'List markdown notes in the vault (most recently modified first). Returns vault-relative paths for use with read_note / write_note.',
    {
      folder: z.string().optional().describe('Limit to a subfolder (relative to the vault root)'),
      limit: z.number().optional().describe('Max notes to return (default 50)'),
    },
    async ({ folder, limit }) =>
      withVault((root) => {
        const notes = listNotes(root, { folder, limit });
        if (notes.length === 0) return 'No notes found.';
        return notes.map((n) => `- ${n.title} — ${n.path} (modified ${n.mtime})`).join('\n');
      }),
  );

  server.tool(
    'read_note',
    'Read a note by its vault-relative path.',
    {
      path: z.string().describe('Note path relative to the vault root (e.g. "Projects/ideas.md")'),
    },
    async ({ path }) =>
      withVault((root) => {
        const note = readNote(root, path);
        return `# ${note.title}\n(${note.path}, modified ${note.mtime})\n\n${note.content}`;
      }),
  );

  server.tool(
    'search_notes',
    'Search notes by keyword (naive case-insensitive substring over filenames and bodies).',
    {
      query: z.string().describe('Text to search for'),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async ({ query, limit }) =>
      withVault((root) => {
        const hits = searchNotes(root, query, { limit });
        if (hits.length === 0) return `No matches for "${query}".`;
        return hits.map((h) => `- ${h.path}${h.line ? `:${h.line}` : ''} — ${h.snippet}`).join('\n');
      }),
  );

  server.tool(
    'write_note',
    'Create or update a note. mode "create" (default) refuses to overwrite an existing note; "append" adds to the end (creating it if absent); "overwrite" replaces it. Prefer "append" for adding to an existing note — writes are atomic but NOT undoable.',
    {
      path: z.string().describe('Note path relative to the vault root (must end in .md)'),
      content: z.string().describe('Markdown content to write'),
      mode: z
        .enum(['create', 'append', 'overwrite'])
        .optional()
        .describe('Write mode (default: create)'),
    },
    async ({ path, content, mode }) =>
      withVault((root) => {
        const note = writeNote(root, path, content, mode ?? 'create');
        return `Wrote ${note.path} (${mode ?? 'create'}).`;
      }),
  );
}
