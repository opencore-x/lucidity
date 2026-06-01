export interface DeliveryMessage {
  title: string;
  body: string;
}

/**
 * A user-facing delivery channel for a briefing. Distinct from the stdout/run-
 * log transcript (which always happens) — this is how the message reaches the
 * user's attention. Chunk 1 ships macOS notifications; phone push (Expo) and
 * others drop in behind this seam later.
 */
export interface Deliverer {
  /** Stable channel id, recorded in the run log (e.g. `"macos"`). */
  readonly name: string;
  deliver(message: DeliveryMessage): Promise<void>;
}
