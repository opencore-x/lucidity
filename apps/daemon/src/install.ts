import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { loadConfig, CONFIG_PATH, LOGS_DIR } from './config.js';

const LABEL = 'my.lucidity.daemon';
const PLIST_PATH = join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const OUT_LOG = join(LOGS_DIR, 'daemon.out.log');
const ERR_LOG = join(LOGS_DIR, 'daemon.err.log');

function requireDarwin(): void {
  if (process.platform !== 'darwin') {
    throw new Error(`install/uninstall/status currently support macOS (launchd) only; got ${process.platform}.`);
  }
}

function uid(): number {
  if (typeof process.getuid !== 'function') throw new Error('Cannot determine uid (non-POSIX).');
  return process.getuid();
}

function which(cmd: string): string | null {
  const r = spawnSync('which', [cmd], { encoding: 'utf8' });
  const out = r.stdout?.trim();
  return r.status === 0 && out ? out : null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** dist/index.js — the daemon entry, sibling of this compiled module. */
function daemonEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), 'index.js');
}

/** PATH baked into the LaunchAgent so `node` and `claude` resolve under launchd. */
function buildPath(nodeBin: string, claudeBin: string | null): string {
  const dirs = [
    dirname(nodeBin),
    claudeBin ? dirname(claudeBin) : null,
    join(homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ].filter((d): d is string => Boolean(d));
  return [...new Set(dirs)].join(':');
}

function renderPlist(nodeBin: string, entry: string, path: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(nodeBin)}</string>
    <string>${escapeXml(entry)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>60</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(path)}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(OUT_LOG)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(ERR_LOG)}</string>
  <key>WorkingDirectory</key>
  <string>${escapeXml(homedir())}</string>
</dict>
</plist>
`;
}

function launchctl(args: string[]): { status: number; stderr: string; stdout: string } {
  const r = spawnSync('launchctl', args, { encoding: 'utf8' });
  return { status: r.status ?? -1, stderr: r.stderr ?? '', stdout: r.stdout ?? '' };
}

export function installAgent(): void {
  requireDarwin();
  // Validate config now so we never install a daemon that crash-loops on boot.
  loadConfig();

  const nodeBin = process.execPath;
  const entry = daemonEntry();
  const claudeBin = which('claude');
  if (!claudeBin) {
    console.error('[install] warning: `claude` not found on PATH now; baking common dirs into the agent PATH. Ensure Claude Code is installed before the first scheduled run.');
  }

  mkdirSync(dirname(PLIST_PATH), { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });

  writeFileSync(PLIST_PATH, renderPlist(nodeBin, entry, buildPath(nodeBin, claudeBin)), { mode: 0o644 });

  const domain = `gui/${uid()}`;
  // Replace any prior instance, then load.
  launchctl(['bootout', `${domain}/${LABEL}`]); // ignore failure (may not be loaded)
  const boot = launchctl(['bootstrap', domain, PLIST_PATH]);
  if (boot.status !== 0) {
    throw new Error(`launchctl bootstrap failed: ${boot.stderr.trim() || `status ${boot.status}`}`);
  }

  console.error(`[install] LaunchAgent installed and started.
  label:  ${LABEL}
  plist:  ${PLIST_PATH}
  logs:   ${OUT_LOG}
          ${ERR_LOG}
  Runs at your configured briefingTime. Check: lucidity-daemon status`);
}

export function uninstallAgent(): void {
  requireDarwin();
  const domain = `gui/${uid()}`;
  const out = launchctl(['bootout', `${domain}/${LABEL}`]);
  if (out.status !== 0 && !/no such process|could not find/i.test(out.stderr)) {
    console.error(`[uninstall] launchctl bootout: ${out.stderr.trim() || `status ${out.status}`}`);
  }
  if (existsSync(PLIST_PATH)) {
    rmSync(PLIST_PATH);
    console.error(`[uninstall] removed ${PLIST_PATH}`);
  } else {
    console.error('[uninstall] no plist found; nothing to remove.');
  }
}

export function agentStatus(): void {
  requireDarwin();
  const installed = existsSync(PLIST_PATH);
  console.error(`plist:     ${installed ? PLIST_PATH : '(not installed)'}`);
  if (!installed) {
    console.error('Run `lucidity-daemon install` to set up the LaunchAgent.');
    return;
  }
  const domain = `gui/${uid()}`;
  const printed = launchctl(['print', `${domain}/${LABEL}`]);
  if (printed.status !== 0) {
    console.error('loaded:    no (plist present but not bootstrapped). Try `lucidity-daemon install`.');
    return;
  }
  const stateLine = printed.stdout.split('\n').map((l) => l.trim()).find((l) => l.startsWith('state ='));
  console.error(`loaded:    yes`);
  console.error(`${stateLine ?? 'state =    (unknown)'}`);
  console.error(`config:    ${CONFIG_PATH}`);
  console.error(`logs:      ${OUT_LOG}`);
}
