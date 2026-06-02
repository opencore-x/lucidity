import { readNotesContext } from '@lucidity/notes';
import type { DaemonConfig } from './config.js';

/**
 * A bounded recent-notes digest for weaving into prompts, or `undefined` when
 * no notes vault is configured, it's empty, or it can't be read. Like the rest
 * of the vault layer, a read failure warns to stderr but never fails the job.
 */
export function loadNotesContext(config: DaemonConfig): string | undefined {
  if (!config.notesPath) return undefined;
  try {
    const ctx = readNotesContext(config.notesPath);
    return ctx.trim() ? ctx : undefined;
  } catch (err) {
    console.error(`[notes] could not read notes context: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}
