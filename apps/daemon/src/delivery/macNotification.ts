import { spawn, spawnSync } from 'node:child_process';
import type { Deliverer, DeliveryMessage } from './types.js';
import { ensureNotifierBundle } from '../notifierBundle.js';

export function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Notifications are single-paragraph and truncated; collapse whitespace. */
export function toBlurb(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}

function hasTerminalNotifier(): boolean {
  try {
    return spawnSync('which', ['terminal-notifier'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/**
 * Delivers via the native macOS Notification Center. Prefers `terminal-notifier`
 * attributed to the generated `Lucidity.app` bundle (`-sender`), so the banner
 * carries the Lucidity name + logo. Falls back to bare terminal-notifier, then
 * `osascript` (whose icon/name can't be branded). Requires macOS. The full
 * briefing still goes to stdout / the run log.
 */
export class MacNotificationDeliverer implements Deliverer {
  readonly name = 'macos';
  private hintShown = false;

  async deliver(message: DeliveryMessage): Promise<void> {
    if (process.platform !== 'darwin') {
      throw new Error('macOS notifications require darwin; set "delivery" to another channel.');
    }
    const body = toBlurb(message.body);

    if (hasTerminalNotifier()) {
      const sender = ensureNotifierBundle(); // bundle provides the icon + "Lucidity" name
      const args = ['-message', body];
      if (sender) args.unshift('-sender', sender);
      else args.unshift('-title', message.title); // no branded bundle → at least label it
      await this.spawnOk('terminal-notifier', args);
      return;
    }

    if (!this.hintShown) {
      console.error('[delivery] tip: `brew install terminal-notifier` for the Lucidity icon/name in notifications.');
      this.hintShown = true;
    }
    const script = `display notification "${escapeForAppleScript(body)}" with title "${escapeForAppleScript(message.title)}"`;
    await this.spawnOk('osascript', ['-e', script]);
  }

  private spawnOk(cmd: string, args: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', (err: NodeJS.ErrnoException) => {
        reject(err.code === 'ENOENT' ? new Error(`${cmd} not found.`) : err);
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${cmd} exited ${code}: ${stderr.trim() || 'unknown error'}`));
      });
    });
  }
}
