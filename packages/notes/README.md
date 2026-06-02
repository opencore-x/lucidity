# @lucidity/notes

The filesystem layer for Lucidity's **files-as-truth** markdown vault — "basically
Obsidian, but Lucid and Claude Code read/write the same `.md` folder next to your
tasks." Node-only (uses `node:fs`), kept out of the mobile-facing `@lucidity/shared`
(which holds only the pure frontmatter util this package reuses).

## API

```ts
import {
  resolveInVault, listNotes, readNote, writeNote, searchNotes, readNotesContext,
} from '@lucidity/notes';
```

- `resolveInVault(root, rel)` — the security boundary: rejects absolute paths, `..`
  traversal, and non-`.md` files. Every read/write goes through it.
- `listNotes(root, { folder?, limit? })` — most-recent first; skips hidden dirs
  (`.obsidian`, `.git`, `.trash`) and symlinks.
- `readNote(root, rel)` / `writeNote(root, rel, content, mode)` — `mode` is
  `'create'` (default, no clobber) | `'append'` | `'overwrite'`; all writes are
  **atomic** (temp file + rename).
- `searchNotes(root, query, { limit? })` — naive case-insensitive substring (no index).
- `readNotesContext(root, { limit?, maxBytes? })` — bounded recent-notes digest for
  prompts.

## Turning notes on

### In an MCP client (Claude Desktop / Claude Code)

The MCP server exposes `list_notes`, `read_note`, `search_notes`, `write_note` when
`LUCIDITY_NOTES_PATH` points at your vault. Example Claude Desktop entry:

```json
{
  "mcpServers": {
    "lucidity": {
      "command": "node",
      "args": ["/path/to/lucidity/packages/mcp-server/dist/index.js"],
      "env": {
        "LUCIDITY_API_KEY": "luc_...",
        "LUCIDITY_NOTES_PATH": "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes"
      }
    }
  }
}
```

If `LUCIDITY_NOTES_PATH` is unset the note tools return a friendly message and the
task tools keep working.

### In the daemon (Lucid's briefings/weekly/chat)

Add `notesPath` to `~/.lucidity/config.json` (distinct from `vaultPath`, which is
Lucid's own memory):

```json
{ "notesPath": "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes" }
```

Lucid then weaves a bounded recent-notes digest into briefings, weekly reviews, and
chat. Verify with `lucidity --run-now briefing`.

## Recommended: a git undo-buffer

Agent writes are atomic but **not undoable**, and iCloud syncs deletions everywhere.
Keep a cheap snapshot history with the git dir **outside** iCloud (so `.git` never
syncs):

```sh
VAULT="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes"
git --git-dir="$HOME/.lucidity/vault-backup.git" --work-tree="$VAULT" init
# optional: skip large binaries
printf '*.wav\n*.mp3\n*.mov\n' > "$HOME/.lucidity/vault-backup.git/info/exclude"
git --git-dir="$HOME/.lucidity/vault-backup.git" --work-tree="$VAULT" add -A
git --git-dir="$HOME/.lucidity/vault-backup.git" --work-tree="$VAULT" commit -m "snapshot"
```

Run the last two lines on a cron (or before agent sessions) for restore points.
