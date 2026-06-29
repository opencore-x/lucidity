/**
 * The room's routing core (#255), factored out of all I/O so it is unit-testable
 * without WebSockets, auth, or a DB. It maps a userId to that user's two peers —
 * the phone and the daemon — and forwards messages between them OPAQUELY: it
 * never inspects payloads, so the relay cannot read chat content (E2E holds).
 *
 * Single-instance, in-memory by design: Render has no sticky sessions, so one
 * `Map` is correct for ONE instance only. A multi-instance Redis backplane is
 * deferred until paying revenue forces it (see the #267 spike).
 */

export type Role = 'phone' | 'daemon';

/** The minimal socket surface the registry needs — satisfied by Hono's WSContext. */
export interface PeerSocket {
  send(data: string | ArrayBuffer | Uint8Array): void;
  close(code?: number, reason?: string): void;
}

interface RoomPeers {
  phone?: PeerSocket;
  daemon?: PeerSocket;
}

export interface RoomStats {
  users: number;
  phones: number;
  daemons: number;
  paired: number;
}

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomPeers>();

  private room(userId: string): RoomPeers {
    let r = this.rooms.get(userId);
    if (!r) {
      r = {};
      this.rooms.set(userId, r);
    }
    return r;
  }

  /**
   * Register a peer for (userId, role). If a peer already holds that role (a
   * stale connection from a prior session), it is closed and replaced —
   * last-writer-wins, so a reconnecting phone/daemon cleanly takes over.
   */
  join(userId: string, role: Role, socket: PeerSocket): void {
    const r = this.room(userId);
    const existing = r[role];
    if (existing && existing !== socket) {
      existing.close(4409, 'replaced by a newer connection');
    }
    r[role] = socket;
  }

  /**
   * Remove a peer. No-ops if `socket` is no longer the registered one (it was
   * already replaced), so a late close from a superseded connection can't evict
   * the live one. Empties the room entry when both peers are gone.
   */
  leave(userId: string, role: Role, socket: PeerSocket): void {
    const r = this.rooms.get(userId);
    if (!r) return;
    if (r[role] === socket) delete r[role];
    if (!r.phone && !r.daemon) this.rooms.delete(userId);
  }

  /**
   * Forward `data` from one role to the other for the same user. Returns true if
   * a counterpart was connected and received it. `data` is passed through
   * untouched — the registry treats it as opaque bytes.
   */
  forward(userId: string, from: Role, data: string | ArrayBuffer | Uint8Array): boolean {
    const r = this.rooms.get(userId);
    if (!r) return false;
    const other = from === 'phone' ? r.daemon : r.phone;
    if (!other) return false;
    other.send(data);
    return true;
  }

  stats(): RoomStats {
    let phones = 0;
    let daemons = 0;
    let paired = 0;
    for (const r of this.rooms.values()) {
      if (r.phone) phones++;
      if (r.daemon) daemons++;
      if (r.phone && r.daemon) paired++;
    }
    return { users: this.rooms.size, phones, daemons, paired };
  }
}
