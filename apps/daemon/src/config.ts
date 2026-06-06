import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { DELIVERY_CHANNELS, isDeliveryChannel, type DeliveryChannel } from './delivery/index.js';

export const CONFIG_DIR = join(homedir(), '.lucidity');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const RUNS_DIR = join(CONFIG_DIR, 'runs');
export const LOGS_DIR = join(CONFIG_DIR, 'logs');

export interface DaemonConfig {
  /** Lucidity API key, `luc_…`. */
  apiKey: string;
  /** API base URL. Default: `http://localhost:3001`. */
  apiUrl: string;
  /** Daily briefing time, 24h `HH:MM`. Default: `08:00`. */
  briefingTime: string;
  /** Optional model alias/id for the executor (e.g. `haiku` to stay frugal). */
  model?: string;
  /** Optional IANA timezone for scheduling (e.g. `Asia/Kolkata`). Default: system tz. */
  timezone?: string;
  /** Optional long-lived token from `claude setup-token` for headless hosts. */
  oauthToken?: string;
  /** User-facing delivery channel. Default: `macos` on darwin, else `stdout`. */
  delivery: DeliveryChannel;
  /** Vault dir for Lucid's memory files. Default: `~/.lucidity/vault`. `~` expands. */
  vaultPath: string;
  /** Dir for the user's markdown notes vault, distinct from `vaultPath`. `~` expands. Optional. */
  notesPath?: string;
  /** Whether Lucid updates MEMORY.md after each briefing (a 2nd model call). Default: true. */
  reflect: boolean;
  /** Loopback port for the interactive chat server. Default: 4849. */
  chatPort: number;
  /** Whether to run the weekly review. Default: true. */
  weeklyReview: boolean;
  /** Weekly-review day of week (0=Sun..6=Sat). Default: Sunday. */
  weeklyReviewDay: number;
  /** Weekly-review time, 24h `HH:MM`. Default: `18:00`. */
  weeklyReviewTime: string;
}

const EXAMPLE = `{
  "apiKey": "luc_xxx",            // from Lucidity → Settings → API Key
  "apiUrl": "http://localhost:3001",
  "briefingTime": "08:00",
  "model": "sonnet",              // optional; "haiku" to stay frugal
  "timezone": "Asia/Kolkata",     // optional; IANA name
  "delivery": "macos",            // optional; "macos" | "stdout"
  "vaultPath": "~/.lucidity/vault", // optional; Lucid's memory files
  "notesPath": "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes", // optional; your markdown vault
  "reflect": true,                // optional; update MEMORY.md after briefings
  "weeklyReview": true,           // optional; run a weekly review
  "weeklyReviewDay": "sun",       // optional; sun..sat or 0-6
  "weeklyReviewTime": "18:00"     // optional; HH:MM
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
export function loadConfig(configPath: string = CONFIG_PATH): DaemonConfig {
  if (!existsSync(configPath)) {
    fail(
      `No config found at ${CONFIG_PATH}.\n` +
        `Create it (chmod 600) with:\n${EXAMPLE}`,
    );
  }

  // Warn on loose permissions (POSIX only).
  if (process.platform !== 'win32') {
    try {
      const mode = statSync(configPath).mode & 0o777;
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
    raw = JSON.parse(readFileSync(configPath, 'utf8'));
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

  const apiUrl = typeof obj['apiUrl'] === 'string' && obj['apiUrl'] ? obj['apiUrl'] : 'http://localhost:3001';

  const briefingTime = typeof obj['briefingTime'] === 'string' && obj['briefingTime'] ? obj['briefingTime'] : '08:00';
  if (!isValidTime(briefingTime)) {
    fail(`${CONFIG_PATH}: "briefingTime" must be 24h "HH:MM" (got "${briefingTime}").`);
  }

  const model = typeof obj['model'] === 'string' && obj['model'] ? obj['model'] : undefined;
  const timezone = typeof obj['timezone'] === 'string' && obj['timezone'] ? obj['timezone'] : undefined;
  const oauthToken = typeof obj['oauthToken'] === 'string' && obj['oauthToken'] ? obj['oauthToken'] : undefined;

  const deliveryRaw = obj['delivery'];
  let delivery: DeliveryChannel;
  if (deliveryRaw === undefined) {
    delivery = process.platform === 'darwin' ? 'macos' : 'stdout';
  } else if (isDeliveryChannel(deliveryRaw)) {
    delivery = deliveryRaw;
  } else {
    fail(`${CONFIG_PATH}: "delivery" must be one of: ${DELIVERY_CHANNELS.join(', ')}.`);
  }

  const vaultRaw = typeof obj['vaultPath'] === 'string' && obj['vaultPath'] ? obj['vaultPath'] : undefined;
  const vaultPath = vaultRaw ? expandHome(vaultRaw) : join(CONFIG_DIR, 'vault');

  const notesRaw = typeof obj['notesPath'] === 'string' && obj['notesPath'] ? obj['notesPath'] : undefined;
  const notesPath = notesRaw ? expandHome(notesRaw) : undefined;

  const reflect = obj['reflect'] === undefined ? true : obj['reflect'] === true;

  const portRaw = obj['chatPort'];
  const chatPort =
    typeof portRaw === 'number' && Number.isInteger(portRaw) && portRaw > 0 && portRaw < 65536 ? portRaw : 4849;

  const weeklyReview = obj['weeklyReview'] === undefined ? true : obj['weeklyReview'] === true;
  const weeklyReviewDay = parseDay(obj['weeklyReviewDay']);
  const weeklyReviewTime =
    typeof obj['weeklyReviewTime'] === 'string' && obj['weeklyReviewTime'] ? obj['weeklyReviewTime'] : '18:00';
  if (!isValidTime(weeklyReviewTime)) {
    fail(`${CONFIG_PATH}: "weeklyReviewTime" must be 24h "HH:MM" (got "${weeklyReviewTime}").`);
  }

  return {
    apiKey, apiUrl, briefingTime, model, timezone, oauthToken, delivery, vaultPath, notesPath, reflect, chatPort,
    weeklyReview, weeklyReviewDay, weeklyReviewTime,
  };
}

function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p;
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Accepts 0-6 or sun..sat (case-insensitive); defaults to Sunday (0). */
function parseDay(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value === 'string') {
    const idx = DAY_NAMES.indexOf(value.trim().toLowerCase().slice(0, 3));
    if (idx >= 0) return idx;
  }
  return 0;
}
