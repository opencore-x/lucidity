import { createInterface } from 'node:readline';
import type { DaemonConfig } from '../config.js';
import { ensureChatToken } from './token.js';

/**
 * Terminal REPL client for interactive Lucid. Thin client of the daemon's
 * loopback chat server: POSTs each message and renders the SSE token stream.
 */
export async function runChatCli(config: DaemonConfig): Promise<void> {
  const token = ensureChatToken();
  const base = `http://127.0.0.1:${config.chatPort}`;

  try {
    const health = await fetch(`${base}/health`);
    if (!health.ok) throw new Error(`status ${health.status}`);
  } catch {
    console.error(
      `Could not reach Lucid at ${base}. Start the daemon first (run \`lucidity-daemon\`, ` +
        `or \`lucidity-daemon install\` to run it in the background).`,
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let sessionId: string | undefined;
  let closed = false;
  rl.on('close', () => {
    closed = true;
  });
  rl.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });

  process.stdout.write('Talk to Lucid. Press Ctrl-C to exit.\n\n');

  const ask = (): void => {
    // stdin ended (Ctrl-D / piped EOF): exit cleanly instead of querying a closed rl.
    if (closed) {
      process.exit(0);
    }
    rl.question('you › ', (line) => {
      const message = line.trim();
      if (!message) {
        ask();
        return;
      }
      void streamTurn(base, token, message, sessionId)
        .then((sid) => {
          if (sid) sessionId = sid;
        })
        .catch((err) => {
          console.error(`\n[error] ${err instanceof Error ? err.message : String(err)}`);
        })
        .finally(ask);
    });
  };

  ask();
}

/** Sends one message, streams the reply to stdout, returns the session id. */
async function streamTurn(
  base: string,
  token: string,
  message: string,
  sessionId: string | undefined,
): Promise<string | undefined> {
  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok || !res.body) throw new Error(`chat request failed (HTTP ${res.status})`);

  process.stdout.write('lucid › ');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let nextSession = sessionId;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      for (const dataLine of frame.split('\n')) {
        if (!dataLine.startsWith('data:')) continue;
        const json = dataLine.slice(5).trim();
        if (!json) continue;
        let ev: { type?: string; text?: string; sessionId?: string; message?: string };
        try {
          ev = JSON.parse(json);
        } catch {
          continue;
        }
        if (ev.type === 'session') nextSession = ev.sessionId ?? nextSession;
        else if (ev.type === 'delta') process.stdout.write(ev.text ?? '');
        else if (ev.type === 'done') process.stdout.write('\n\n');
        else if (ev.type === 'error') process.stdout.write(`\n[error] ${ev.message ?? 'unknown'}\n\n`);
      }
    }
  }
  return nextSession;
}
