import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { Deliverer, DeliveryMessage } from './types.js';

export function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Notifications are single-paragraph and truncated; collapse whitespace. */
export function toBlurb(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}

/** Bundled Lucidity logo (copied into dist/assets at build). undefined if absent (e.g. dev). */
function resolveIconPath(): string | undefined {
  try {
    const p = fileURLToPath(new URL('../assets/lucid-icon.png', import.meta.url));
    return existsSync(p) ? p : undefined;
  } catch {
    return undefined;
  }
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
 * (so the notification carries the Lucidity logo), falling back to `osascript`
 * (which always shows the script runner's icon — no way to brand it). Requires
 * macOS. The full briefing still goes to stdout/the run log.
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
      const icon = resolveIconPath();
      const args = ['-title', message.title, '-message', body];
      if (icon) args.push('-appIcon', icon, '-contentImage', icon);
      await this.spawnOk('terminal-notifier', args);
      return;
    }
    if (!this.hintShown) {
      console.error('[delivery] tip: `brew install terminal-notifier` to show the Lucidity logo in notifications.');
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
