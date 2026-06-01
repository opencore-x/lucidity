import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';

export const NOTIFIER_BUNDLE_ID = 'my.lucidity.notifier';
const BUNDLE_NAME = 'Lucidity';
// Computed directly (not via config) to avoid an import cycle config → delivery → notifierBundle.
const BUNDLE_PATH = join(homedir(), '.lucidity', `${BUNDLE_NAME}.app`);
const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>${BUNDLE_NAME}</string>
  <key>CFBundleDisplayName</key><string>${BUNDLE_NAME}</string>
  <key>CFBundleIdentifier</key><string>${NOTIFIER_BUNDLE_ID}</string>
  <key>CFBundleIconFile</key><string>lucid</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>${BUNDLE_NAME}</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
</dict></plist>
`;

function iconSource(): string {
  return fileURLToPath(new URL('./assets/lucid-icon.png', import.meta.url));
}

function isValidBundle(): boolean {
  return (
    existsSync(join(BUNDLE_PATH, 'Contents', 'Info.plist')) &&
    existsSync(join(BUNDLE_PATH, 'Contents', 'Resources', 'lucid.icns'))
  );
}

function buildIcns(src: string, dest: string): void {
  const tmp = mkdtempSync(join(tmpdir(), 'lucidity-icon-'));
  // iconutil requires the input directory to be named `*.iconset`.
  const iconset = join(tmp, 'icon.iconset');
  mkdirSync(iconset);
  try {
    for (const s of [16, 32, 128, 256, 512]) {
      spawnSync('sips', ['-z', String(s), String(s), src, '--out', join(iconset, `icon_${s}x${s}.png`)], { stdio: 'ignore' });
      const d = s * 2;
      spawnSync('sips', ['-z', String(d), String(d), src, '--out', join(iconset, `icon_${s}x${s}@2x.png`)], { stdio: 'ignore' });
    }
    const r = spawnSync('iconutil', ['-c', 'icns', iconset, '-o', dest], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`iconutil failed: ${r.stderr?.trim() || `status ${r.status}`}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Ensures `~/.lucidity/Lucidity.app` exists and is registered with LaunchServices,
 * so `terminal-notifier --sender` shows the "Lucidity" name + logo on notifications
 * (macOS attributes a notification's icon/name to the posting bundle; osascript and
 * bare terminal-notifier can't override theirs). Idempotent and best-effort: returns
 * the bundle id, or null on non-darwin / if generation fails (caller falls back).
 */
export function ensureNotifierBundle(): string | null {
  if (process.platform !== 'darwin') return null;
  try {
    if (!isValidBundle()) {
      const src = iconSource();
      if (!existsSync(src)) return null;
      mkdirSync(join(BUNDLE_PATH, 'Contents', 'MacOS'), { recursive: true });
      mkdirSync(join(BUNDLE_PATH, 'Contents', 'Resources'), { recursive: true });
      buildIcns(src, join(BUNDLE_PATH, 'Contents', 'Resources', 'lucid.icns'));
      writeFileSync(join(BUNDLE_PATH, 'Contents', 'Info.plist'), INFO_PLIST, 'utf8');
      const exe = join(BUNDLE_PATH, 'Contents', 'MacOS', BUNDLE_NAME);
      writeFileSync(exe, '#!/bin/sh\n', 'utf8');
      chmodSync(exe, 0o755);
      spawnSync(LSREGISTER, ['-f', BUNDLE_PATH], { stdio: 'ignore' });
    }
    return NOTIFIER_BUNDLE_ID;
  } catch (err) {
    console.error(`[notifier] could not build Lucidity.app: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
