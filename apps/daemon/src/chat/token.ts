import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CONFIG_DIR } from '../config.js';

const TOKEN_PATH = join(CONFIG_DIR, 'chat-token');

/**
 * Reads (or generates) the local chat-server auth token at
 * `~/.lucidity/chat-token` (mode 600). Both the server and the CLI client read
 * it, so any process can authenticate to the loopback chat server. Never logged.
 */
export function ensureChatToken(): string {
  if (existsSync(TOKEN_PATH)) {
    const token = readFileSync(TOKEN_PATH, 'utf8').trim();
    if (token) return token;
  }
  const token = randomBytes(24).toString('hex');
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, `${token}\n`, { mode: 0o600 });
  return token;
}
