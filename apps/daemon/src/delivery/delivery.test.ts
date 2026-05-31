import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeForAppleScript, toBlurb, MacNotificationDeliverer } from './macNotification.js';
import { NoopDeliverer } from './noop.js';
import { createDeliverer, isDeliveryChannel, DELIVERY_CHANNELS } from './index.js';

test('escapeForAppleScript escapes quotes and backslashes (no script break)', () => {
  assert.equal(escapeForAppleScript('say "hi"'), 'say \\"hi\\"');
  assert.equal(escapeForAppleScript('a\\b'), 'a\\\\b');
  assert.equal(escapeForAppleScript('plain text'), 'plain text');
});

test('toBlurb collapses newlines/whitespace to a single line', () => {
  assert.equal(toBlurb('Good morning.\n\nPay the cards.\n  Then taxes.'), 'Good morning. Pay the cards. Then taxes.');
  assert.equal(toBlurb('   trimmed   '), 'trimmed');
});

test('isDeliveryChannel guards the channel union', () => {
  assert.ok(isDeliveryChannel('macos'));
  assert.ok(isDeliveryChannel('stdout'));
  assert.ok(!isDeliveryChannel('push'));
  assert.ok(!isDeliveryChannel(42));
  assert.deepEqual([...DELIVERY_CHANNELS], ['macos', 'stdout']);
});

test('createDeliverer returns the matching channel implementation', () => {
  assert.ok(createDeliverer('macos') instanceof MacNotificationDeliverer);
  assert.ok(createDeliverer('stdout') instanceof NoopDeliverer);
  assert.equal(createDeliverer('macos').name, 'macos');
  assert.equal(createDeliverer('stdout').name, 'stdout');
});

test('NoopDeliverer resolves without side effects', async () => {
  await createDeliverer('stdout').deliver({ title: 'Lucid', body: 'anything' });
});
