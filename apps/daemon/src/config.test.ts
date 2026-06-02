import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.js';

function withConfig(json: unknown, fn: (path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'luc-cfg-'));
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify(json));
  chmodSync(path, 0o600); // silence the loose-permission warning
  try {
    fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('loadConfig: notesPath is optional and undefined by default', () => {
  withConfig({ apiKey: 'luc_test' }, (path) => {
    assert.equal(loadConfig(path).notesPath, undefined);
  });
});

test('loadConfig: notesPath expands ~ and stays distinct from the memory vaultPath', () => {
  withConfig({ apiKey: 'luc_test', notesPath: '~/Notes' }, (path) => {
    const c = loadConfig(path);
    assert.equal(c.notesPath, join(homedir(), 'Notes'));
    assert.notEqual(c.notesPath, c.vaultPath);
  });
});
