import type { Context } from 'hono';
import type { WSContext, UpgradeWebSocket } from 'hono/ws';
import type { WebSocket as NodeWebSocket } from 'ws';
import { RoomRegistry, type Role, type RoomStats } from './registry.js';

/**
 * Resolves a handshake to a userId (or null to reject). The default uses the
 * shared `getCurrentUser` (daemon `luc_` key or phone Clerk JWT); tests inject a
 * stub so the real WS wiring can be exercised without a DB/Clerk.
 */
export type RoomAuthenticator = (c: Context) => Promise<{ id: string } | null>;

const defaultAuthenticate: RoomAuthenticator = async (c) => {
  // Lazy-imported so this module (and tests that stub auth) stay importable
  // without DATABASE_URL — the DB client only initializes when really used.
  const { getCurrentUser } = await import('../lib/auth.js');
  try {
    const user = await getCurrentUser(c);
    return { id: user.id };
  } catch {
    return null;
  }
};

/**
 * The hosted room/relay (#255): one WebSocket endpoint both the phone and the
 * daemon dial OUT to. It bridges them by userId and relays bytes opaquely (E2E
 * pass-through — it cannot read content). Co-located on the existing Hono/Render
 * API per the #267 spike (Option A: single Node `ws`, in-memory, single-instance).
 *
 *   phone (Clerk JWT) ─┐                       ┌─ daemon (luc_ key)
 *                      └─▶  /api/room  (this)  ◀┘
 */

const registry = new RoomRegistry();

// Render imposes no idle WS timeout, but app-level ping/pong is still required to
// reap half-open sockets. We track each peer's raw `ws` socket for the sweep.
const liveSockets = new Set<NodeWebSocket>();
const DEFAULT_HEARTBEAT_MS = 30_000;

interface Aliveable {
  isAlive?: boolean;
}

function trackForHeartbeat(raw: NodeWebSocket | undefined): void {
  if (!raw) return;
  (raw as Aliveable).isAlive = true;
  raw.on('pong', () => {
    (raw as Aliveable).isAlive = true;
  });
  raw.on('close', () => liveSockets.delete(raw));
  liveSockets.add(raw);
}

function roleFromQuery(value: string | undefined): Role | null {
  return value === 'phone' || value === 'daemon' ? value : null;
}

/**
 * Build the `/api/room` handler. Authentication runs at the handshake (before the
 * peer is bridged): the daemon presents `Authorization: Bearer luc_…`, the phone
 * a Clerk JWT — both resolved by the shared `getCurrentUser`. An unauthenticated
 * or mis-roled socket is closed and never joins a room (#270 hardens this further).
 */
export function createRoomHandler(
  upgradeWebSocket: UpgradeWebSocket<NodeWebSocket>,
  authenticate: RoomAuthenticator = defaultAuthenticate,
) {
  return upgradeWebSocket(async (c) => {
    const user = await authenticate(c);
    const userId = user?.id ?? null; // null → closed in onOpen with a policy code
    const role = roleFromQuery(c.req.query('role'));

    // Captured so a late close from a superseded connection can't evict the live one.
    let joined: WSContext<NodeWebSocket> | null = null;

    return {
      onOpen(_evt, ws) {
        if (!userId) {
          ws.close(4401, 'unauthorized');
          return;
        }
        if (!role) {
          ws.close(4400, 'role query must be "phone" or "daemon"');
          return;
        }
        registry.join(userId, role, ws);
        joined = ws;
        trackForHeartbeat(ws.raw);
      },

      onMessage(evt, ws) {
        if (!userId || !role) return;
        const raw = ws.raw as Aliveable | undefined;
        if (raw) raw.isAlive = true;
        // Opaque bridge to the counterpart. evt.data is forwarded untouched; a
        // Node `ws` Buffer is already a Uint8Array, so it satisfies send().
        registry.forward(userId, role, evt.data as string | ArrayBuffer | Uint8Array);
      },

      onClose() {
        if (userId && role && joined) registry.leave(userId, role, joined);
      },

      onError() {
        if (userId && role && joined) registry.leave(userId, role, joined);
      },
    };
  });
}

/** Start the heartbeat sweep. Call once after the server is listening. */
export function startRoomHeartbeat(intervalMs: number = DEFAULT_HEARTBEAT_MS): () => void {
  const timer = setInterval(() => {
    for (const raw of liveSockets) {
      if ((raw as Aliveable).isAlive === false) {
        raw.terminate();
        liveSockets.delete(raw);
        continue;
      }
      (raw as Aliveable).isAlive = false;
      try {
        raw.ping();
      } catch {
        liveSockets.delete(raw);
      }
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Live room counts — for a health/debug endpoint. */
export function getRoomStats(): RoomStats {
  return registry.stats();
}
