import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';

export const CONFIG_DIR = join(homedir(), '.lucidity');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const RUNS_DIR = join(CONFIG_DIR, 'runs');

export interface DaemonConfig {
  /** Lucidity API key, `luc_…`. */
  apiKey: string;
  /** API base URL. Default: `http://localhost:3000`. */
  apiUrl: string;
  /** Daily briefing time, 24h `HH:MM`. Default: `08:00`. */
  briefingTime: string;
  /** Optional model alias/id for the executor (e.g. `haiku` to stay frugal). */
  model?: string;
  /** Optional IANA timezone for scheduling (e.g. `Asia/Kolkata`). Default: system tz. */
  timezone?: string;
  /** Optional long-lived token from `claude setup-token` for headless hosts. */
  oauthToken?: string;
}

const EXAMPLE = `{
  "apiKey": "luc_xxx",            // from Lucidity → Settings → API Key
  "apiUrl": "http://localhost:3000",
  "briefingTime": "08:00",
  "model": "sonnet",              // optional; "haiku" to stay frugal
  "timezone": "Asia/Kolkata"      // optional; IANA name
}`;

function fail(message: string): never {
  throw new Error(message);
}

function isValidTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Loads and validates `~/.lucidity/config.json`. Throws a clear, secret-free
 * error if the file is missing/invalid. Warns (stderr) if the file is readable
 * by group/other. Never logs the API key.
 */
export function loadConfig(): DaemonConfig {
  if (!existsSync(CONFIG_PATH)) {
    fail(
      `No config found at ${CONFIG_PATH}.\n` +
        `Create it (chmod 600) with:\n${EXAMPLE}`,
    );
  }

  // Warn on loose permissions (POSIX only).
  if (process.platform !== 'win32') {
    try {
      const mode = statSync(CONFIG_PATH).mode & 0o777;
      if (mode & 0o077) {
        console.error(
          `[config] warning: ${CONFIG_PATH} is group/other-accessible (mode ${mode.toString(8)}). ` +
            `Run: chmod 600 ${CONFIG_PATH}`,
        );
      }
    } catch {
      // stat failure is non-fatal; continue.
    }
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    fail(`Could not parse ${CONFIG_PATH}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (typeof raw !== 'object' || raw === null) {
    fail(`${CONFIG_PATH} must contain a JSON object.`);
  }
  const obj = raw as Record<string, unknown>;

  const apiKey = obj['apiKey'];
  if (typeof apiKey !== 'string' || !apiKey.startsWith('luc_')) {
    fail(`${CONFIG_PATH}: "apiKey" is required and must start with "luc_".`);
  }

  const apiUrl = typeof obj['apiUrl'] === 'string' && obj['apiUrl'] ? obj['apiUrl'] : 'http://localhost:3000';

  const briefingTime = typeof obj['briefingTime'] === 'string' && obj['briefingTime'] ? obj['briefingTime'] : '08:00';
  if (!isValidTime(briefingTime)) {
    fail(`${CONFIG_PATH}: "briefingTime" must be 24h "HH:MM" (got "${briefingTime}").`);
  }

  const model = typeof obj['model'] === 'string' && obj['model'] ? obj['model'] : undefined;
  const timezone = typeof obj['timezone'] === 'string' && obj['timezone'] ? obj['timezone'] : undefined;
  const oauthToken = typeof obj['oauthToken'] === 'string' && obj['oauthToken'] ? obj['oauthToken'] : undefined;

  return { apiKey, apiUrl, briefingTime, model, timezone, oauthToken };
}
