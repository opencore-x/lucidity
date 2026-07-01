import { WebSocket } from 'ws';
import { HarnessRequestSchema } from '@lucidity/shared';
import type { ExecutorStreamEvent, LucidHarness } from '@lucidity/runtime';
import type { DaemonConfig } from '../config.js';
import type { Vault } from '../vault.js';
import { loadAskContext, loadBriefingContext, type AskContext, type BriefingContext } from './context.js';

/**
 * The daemon's outbound client to the hosted room (#255). It dials
 * `wss://<api>/api/room?role=daemon` with the `luc_` key, then serves the harness
 * over the socket: each inbound {@link HarnessRequestSchema} request runs through
 * {@link LucidHarness} and its reply (buffered or streamed) goes back correlated
 * by request id. This is the FREE path — the model runs locally via `claude -p`.
 *
 * It must never take the daemon down: reconnects with capped backoff and treats
 * every failure as recoverable. Auth rides an `Authorization` header (the reason
 * we use the `ws` package — Node's global WebSocket can't set request headers).
 */

export interface DispatchDeps {
  harness: LucidHarness;
  askContext: () => Promise<AskContext>;
  briefingContext: () => Promise<BriefingContext>;
  /** Serialize + send one wire message to the counterpart (phone). */
  send: (obj: unknown) => void;
  /** Aborts in-flight model runs on daemon shutdown. */
  signal?: AbortSignal;
}

function sendStreamEvent(send: (obj: unknown) => void, requestId: string, ev: ExecutorStreamEvent): void {
  if (ev.type === 'delta') send({ type: 'delta', requestId, text: ev.text });
  else send({ type: 'done', requestId, text: ev.text, sessionId: ev.sessionId, costUsd: ev.costUsd });
}

/**
 * Route one raw wire message to the harness and emit the reply. Pure of any
 * socket/reconnect concern so it is unit-testable with a fake harness + a
 * capturing `send`. Unparseable input is dropped (no id to correlate a reply);
 * a mid-run failure becomes a correlated `error` stream event.
 */
export async function dispatchRequest(raw: string, deps: DispatchDeps): Promise<void> {
  const { harness, askContext, briefingContext, send, signal } = deps;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }
  const parsed = HarnessRequestSchema.safeParse(json);
  if (!parsed.success) return;
  const req = parsed.data;

  try {
    if (req.kind === 'ask') {
      const input = { ...(await askContext()), prompt: req.prompt, signal };
      if (req.stream) {
        for await (const ev of harness.askStream(input)) sendStreamEvent(send, req.id, ev);
      } else {
        const reply = await harness.ask(input);
        send({ requestId: req.id, kind: 'ask', text: reply.text, sessionId: reply.sessionId, costUsd: reply.costUsd });
      }
    } else if (req.kind === 'briefing') {
      const input = { ...(await briefingContext()), signal };
      if (req.stream) {
        for await (const ev of harness.briefingStream(input)) sendStreamEvent(send, req.id, ev);
      } else {
        const reply = await harness.briefing(input);
        send({ requestId: req.id, kind: 'briefing', text: reply.text, costUsd: reply.costUsd });
      }
    } else {
      const result = await harness.journal({ limit: req.limit, before: req.before });
      send({ requestId: req.id, kind: 'journal', entries: result.entries, nextBefore: result.nextBefore });
    }
  } catch (err) {
    send({ type: 'error', requestId: req.id, message: err instanceof Error ? err.message : String(err) });
  }
}

export interface RoomClientOptions {
  config: DaemonConfig;
  harness: LucidHarness;
  vault: Vault;
  /** Daemon-shutdown signal; aborts in-flight runs and stops reconnecting. */
  signal?: AbortSignal;
  logger?: (msg: string) => void;
}

export interface RoomClientHandle {
  stop(): void;
}

const MAX_BACKOFF_MS = 30_000;

/** Build the daemon's room URL from the API base, upgrading the scheme to ws/wss. */
export function roomUrl(apiUrl: string): string {
  const u = new URL('/api/room', apiUrl);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.searchParams.set('role', 'daemon');
  return u.toString();
}

/**
 * Start the room client. Returns a handle whose `stop()` closes the socket and
 * halts reconnection. Also stops automatically if `signal` aborts.
 */
export function startRoomClient(opts: RoomClientOptions): RoomClientHandle {
  const { config, harness, vault, signal } = opts;
  const log = opts.logger ?? ((m: string) => console.error(`[room] ${m}`));
  const url = roomUrl(config.apiUrl);
  const askContext = () => loadAskContext(config, vault);
  const briefingContext = () => loadBriefingContext(config, vault);

  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS) + Math.floor(Math.random() * 500);
    attempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
    reconnectTimer.unref?.();
  }

  function connect(): void {
    if (stopped) return;
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${config.apiKey}` } });
    socket = ws;
    const send = (obj: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };

    ws.on('open', () => {
      attempt = 0;
      log(`connected to ${url}`);
    });
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      const raw = Array.isArray(data) ? Buffer.concat(data).toString() : data.toString();
      void dispatchRequest(raw, { harness, askContext, briefingContext, send, signal }).catch((err) => {
        log(`dispatch error: ${err instanceof Error ? err.message : String(err)}`);
      });
    });
    ws.on('close', () => {
      if (socket === ws) socket = null;
      scheduleReconnect();
    });
    ws.on('error', (err: Error) => {
      log(`socket error: ${err.message}`);
      // A 'close' follows and drives reconnection.
    });
  }

  function stop(): void {
    if (stopped) return;
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
  }

  if (signal) {
    if (signal.aborted) stopped = true;
    else signal.addEventListener('abort', stop, { once: true });
  }
  if (!stopped) connect();

  return { stop };
}
