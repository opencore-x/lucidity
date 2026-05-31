import { spawn } from 'node:child_process';
import type { Deliverer, DeliveryMessage } from './types.js';

export function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Notifications are single-paragraph and truncated; collapse whitespace. */
export function toBlurb(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}

/**
 * Delivers via the native macOS Notification Center using `osascript`. Works
 * from a LaunchAgent (the user's GUI session). Requires macOS — throws on other
 * platforms so the daemon can warn and fall back. The full briefing still goes
 * to stdout/the run log; this is the short attention-grabbing surface.
 */
export class MacNotificationDeliverer implements Deliverer {
  readonly name = 'macos';

  async deliver(message: DeliveryMessage): Promise<void> {
    if (process.platform !== 'darwin') {
      throw new Error('macOS notifications require darwin; set "delivery" to another channel.');
    }
    const title = escapeForAppleScript(message.title);
    const body = escapeForAppleScript(toBlurb(message.body));
    await this.osascript(`display notification "${body}" with title "${title}"`);
  }

  private osascript(script: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const child = spawn('osascript', ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', (err: NodeJS.ErrnoException) => {
        reject(
          err.code === 'ENOENT'
            ? new Error('osascript not found (expected on macOS).')
            : err,
        );
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`osascript exited ${code}: ${stderr.trim() || 'unknown error'}`));
      });
    });
  }
}
