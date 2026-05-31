import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadDefaultPersona, parseFacts, renderMemoryFile } from '@lucidity/runtime';

export interface SessionEntry {
  /** ISO 8601 start time. */
  startedAt: string;
  briefing: string;
  deliveredVia: string;
  factsLearned: string[];
}

/**
 * File-based vault for Lucid's memory (files are the source of truth). Reads
 * persona (SOUL.md) + durable facts (MEMORY.md), writes back updated memory and
 * per-run session logs. All writes are best-effort: a vault failure warns to
 * stderr but never takes the daemon down.
 */
export interface Vault {
  readonly path: string;
  /** SOUL.md if present (and non-empty), else the packaged default — seeding SOUL.md so it's editable. */
  readPersona(): string;
  /** Durable facts from MEMORY.md (empty if absent/malformed). */
  readMemoryFacts(): string[];
  writeMemoryFacts(facts: string[]): void;
  writeSessionLog(entry: SessionEntry): void;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createVault(vaultPath: string): Vault {
  const soulPath = join(vaultPath, 'SOUL.md');
  const memoryPath = join(vaultPath, 'MEMORY.md');
  const sessionsDir = join(vaultPath, 'sessions');

  return {
    path: vaultPath,

    readPersona(): string {
      if (existsSync(soulPath)) {
        const soul = readFileSync(soulPath, 'utf8').trim();
        if (soul) return soul;
      }
      const def = loadDefaultPersona();
      try {
        mkdirSync(vaultPath, { recursive: true });
        if (!existsSync(soulPath)) writeFileSync(soulPath, `${def}\n`, 'utf8');
      } catch (err) {
        console.error(`[vault] could not seed SOUL.md: ${msg(err)}`);
      }
      return def;
    },

    readMemoryFacts(): string[] {
      if (!existsSync(memoryPath)) return [];
      try {
        return parseFacts(readFileSync(memoryPath, 'utf8'));
      } catch (err) {
        console.error(`[vault] could not read MEMORY.md: ${msg(err)}`);
        return [];
      }
    },

    writeMemoryFacts(facts: string[]): void {
      try {
        mkdirSync(vaultPath, { recursive: true });
        writeFileSync(memoryPath, renderMemoryFile(facts), 'utf8');
      } catch (err) {
        console.error(`[vault] could not write MEMORY.md: ${msg(err)}`);
      }
    },

    writeSessionLog(entry: SessionEntry): void {
      try {
        mkdirSync(sessionsDir, { recursive: true });
        const stamp = entry.startedAt.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
        const facts = entry.factsLearned.length
          ? entry.factsLearned.map((f) => `- ${f}`).join('\n')
          : '_(none)_';
        const content =
          `# Briefing — ${entry.startedAt}\n\n` +
          `Delivered via: ${entry.deliveredVia}\n\n` +
          `## Briefing\n\n${entry.briefing.trim()}\n\n` +
          `## Facts learned\n\n${facts}\n`;
        writeFileSync(join(sessionsDir, `${stamp}-briefing.md`), content, 'utf8');
      } catch (err) {
        console.error(`[vault] could not write session log: ${msg(err)}`);
      }
    },
  };
}
