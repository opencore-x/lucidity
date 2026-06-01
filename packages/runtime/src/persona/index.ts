import { readFileSync } from 'node:fs';

/**
 * Loads the default "Lucid" persona template shipped with the runtime.
 *
 * The template is authored as Markdown (`lucid.md`) so it stays human-editable
 * and mirrors the future vault `SOUL.md` (decision D2). It is resolved relative
 * to this module so it works both from source (tsx/dev) and the compiled
 * `dist/` — the package `build` step copies `lucid.md` next to the emitted JS.
 *
 * User-customized personas live in Postgres and are read via the API; this
 * bundled file is the default/fallback (Chunk 0 uses only this default).
 */
export function loadDefaultPersona(): string {
  const url = new URL('./lucid.md', import.meta.url);
  return readFileSync(url, 'utf8').trim();
}
