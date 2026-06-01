import type { Deliverer, DeliveryMessage } from './types.js';

/**
 * No extra user-facing delivery. The briefing still goes to stdout / the run
 * log (the transcript) — this channel just declines to push it anywhere else.
 * Useful headless or while testing.
 */
export class NoopDeliverer implements Deliverer {
  readonly name = 'stdout';
  async deliver(_message: DeliveryMessage): Promise<void> {
    // Transcript-only: nothing to do.
  }
}
