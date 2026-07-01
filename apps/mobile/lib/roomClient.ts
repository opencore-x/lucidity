import { uuidv7 } from 'uuidv7';
import type { HarnessStreamEvent, HarnessResponse } from '@lucidity/shared';

/**
 * Phone-side client for the Lucid harness room (M6). Opens ONE WebSocket to
 * `/api/room?role=phone` (Clerk token in the handshake header), sends `ask`
 * requests, and streams the reply back — correlated by request id so one socket
 * multiplexes turns. The room is transport-only; the model runs on the user's
 * daemon (`claude -p`), so a reply only arrives if that daemon peer is connected
 * — hence the per-request timeout that surfaces "Lucid unreachable".
 *
 * Wire messages are validated structurally (not via Zod) to keep the RN bundle
 * lean; the sender is trusted daemon code, so shape checks are sufficient.
 */

export type RoomStatus = 'idle' | 'connecting' | 'open' | 'closed';

export interface AskCallbacks {
  onDelta: (text: string) => void;
  onDone: (full: string, meta: { sessionId?: string; costUsd?: number }) => void;
  onError: (message: string) => void;
}

export interface RoomClientOptions {
  /** ws(s)://host/api/room?role=phone */
  url: string;
  getToken: () => Promise<string | null>;
  onStatus?: (status: RoomStatus) => void;
  /** Raw close code (e.g. 4401 unauthorized) for diagnostics. */
  onClose?: (code: number) => void;
  /** Ms to wait for a first token before declaring the daemon unreachable. */
  firstTokenTimeoutMs?: number;
}

// RN's WebSocket accepts an options bag (headers) as the 3rd arg; the DOM lib type doesn't model it.
type RNWebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;

function asStreamEvent(m: Record<string, unknown>): HarnessStreamEvent | null {
  const t = m.type;
  if (typeof m.requestId === 'string' && (t === 'delta' || t === 'done' || t === 'error' || t === 'tool_call')) {
    return m as unknown as HarnessStreamEvent;
  }
  return null;
}

function asResponse(m: Record<string, unknown>): HarnessResponse | null {
  const k = m.kind;
  if (typeof m.requestId === 'string' && (k === 'ask' || k === 'briefing' || k === 'journal')) {
    return m as unknown as HarnessResponse;
  }
  return null;
}

const DEFAULT_FIRST_TOKEN_TIMEOUT = 30_000;

export class LucidRoomClient {
  private ws: WebSocket | null = null;
  private status: RoomStatus = 'idle';
  private readonly pending = new Map<string, AskCallbacks>();
  private readonly buffers = new Map<string, string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private outbox: string[] = [];
  private closedByUser = false;

  constructor(private readonly opts: RoomClientOptions) {}

  getStatus(): RoomStatus {
    return this.status;
  }

  async connect(): Promise<void> {
    if (this.status === 'open' || this.status === 'connecting') return;
    this.closedByUser = false;
    this.setStatus('connecting');
    let token: string | null = null;
    try {
      token = await this.opts.getToken();
    } catch {
      // fall through with no token → the room will reject and we surface it via onClose
    }
    if (this.closedByUser) return;

    const ws = new (WebSocket as unknown as RNWebSocketCtor)(
      this.opts.url,
      undefined,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    );
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus('open');
      const out = this.outbox;
      this.outbox = [];
      for (const payload of out) ws.send(payload);
    };
    ws.onmessage = (e: WebSocketMessageEvent) => {
      this.handleMessage(typeof e.data === 'string' ? e.data : String(e.data));
    };
    ws.onerror = () => {
      // onclose follows; nothing to do here.
    };
    ws.onclose = (e: WebSocketCloseEvent) => {
      this.ws = null;
      this.setStatus('closed');
      this.failAll('Disconnected from Lucid.');
      if (typeof e?.code === 'number') this.opts.onClose?.(e.code);
    };
  }

  /** Send a one-shot streamed ask. Returns the request id. */
  ask(prompt: string, cb: AskCallbacks): string {
    const id = uuidv7();
    this.pending.set(id, cb);
    this.buffers.set(id, '');
    this.armTimeout(id);

    const payload = JSON.stringify({ id, kind: 'ask', prompt, stream: true });
    if (this.ws && this.status === 'open') {
      this.ws.send(payload);
    } else {
      this.outbox.push(payload);
      if (this.status !== 'connecting') void this.connect();
    }
    return id;
  }

  close(): void {
    this.closedByUser = true;
    this.clearAllTimers();
    this.ws?.close();
    this.ws = null;
    this.setStatus('closed');
  }

  private handleMessage(raw: string): void {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof json !== 'object' || json === null) return;
    const msg = json as Record<string, unknown>;

    const ev = asStreamEvent(msg);
    if (ev) {
      this.dispatchStream(ev);
      return;
    }
    const resp = asResponse(msg);
    if (resp) {
      this.dispatchResponse(resp);
    }
  }

  private dispatchStream(ev: HarnessStreamEvent): void {
    const cb = this.pending.get(ev.requestId);
    if (!cb) return;
    if (ev.type === 'delta') {
      this.clearTimeout(ev.requestId); // first/any token → not unreachable
      this.buffers.set(ev.requestId, (this.buffers.get(ev.requestId) ?? '') + ev.text);
      cb.onDelta(ev.text);
    } else if (ev.type === 'done') {
      const full = ev.text || this.buffers.get(ev.requestId) || '';
      this.finish(ev.requestId);
      cb.onDone(full, { sessionId: ev.sessionId, costUsd: ev.costUsd });
    } else if (ev.type === 'error') {
      this.finish(ev.requestId);
      cb.onError(ev.message);
    }
    // 'tool_call' is ignored in v1.
  }

  private dispatchResponse(resp: HarnessResponse): void {
    const cb = this.pending.get(resp.requestId);
    if (!cb) return;
    this.finish(resp.requestId);
    if (resp.kind === 'ask' || resp.kind === 'briefing') {
      const sessionId = 'sessionId' in resp ? resp.sessionId : undefined;
      cb.onDone(resp.text, { sessionId, costUsd: resp.costUsd });
    }
  }

  private armTimeout(id: string): void {
    const ms = this.opts.firstTokenTimeoutMs ?? DEFAULT_FIRST_TOKEN_TIMEOUT;
    const timer = setTimeout(() => {
      const cb = this.pending.get(id);
      this.finish(id);
      cb?.onError("Lucid didn't respond. Is your Mac (the Lucid daemon) running and signed in to the same account?");
    }, ms);
    this.timers.set(id, timer);
  }

  private clearTimeout(id: string): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  private finish(id: string): void {
    this.clearTimeout(id);
    this.pending.delete(id);
    this.buffers.delete(id);
  }

  private failAll(message: string): void {
    for (const [, cb] of this.pending) cb.onError(message);
    this.clearAllTimers();
    this.pending.clear();
    this.buffers.clear();
  }

  private clearAllTimers(): void {
    for (const [, t] of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private setStatus(status: RoomStatus): void {
    this.status = status;
    this.opts.onStatus?.(status);
  }
}

/** Build the room WebSocket URL from the REST API base (http→ws, https→wss). */
export function roomWsUrl(apiUrl: string): string {
  const base = apiUrl.replace(/\/+$/, '').replace(/^http/, 'ws');
  return `${base}/api/room?role=phone`;
}
