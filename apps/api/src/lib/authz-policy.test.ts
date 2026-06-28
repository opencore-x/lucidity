import test from 'node:test';
import assert from 'node:assert/strict';
import { decideProjectAccess } from './authz-policy.js';

// Owner can always read and write, regardless of visibility.
test('owner: read + write allowed (private)', () => {
  const ctx = { isOwner: true, memberAccess: null, visibility: 'private' as const };
  assert.equal(decideProjectAccess('read', ctx), true);
  assert.equal(decideProjectAccess('write', ctx), true);
});

test('owner: read + write allowed (public)', () => {
  const ctx = { isOwner: true, memberAccess: null, visibility: 'public' as const };
  assert.equal(decideProjectAccess('read', ctx), true);
  assert.equal(decideProjectAccess('write', ctx), true);
});

// Member with edit: read + write.
test('member edit: read + write allowed', () => {
  const ctx = { isOwner: false, memberAccess: 'edit' as const, visibility: 'shared' as const };
  assert.equal(decideProjectAccess('read', ctx), true);
  assert.equal(decideProjectAccess('write', ctx), true);
});

// Member with view: read only, no write.
test('member view: read allowed, write denied', () => {
  const ctx = { isOwner: false, memberAccess: 'view' as const, visibility: 'shared' as const };
  assert.equal(decideProjectAccess('read', ctx), true);
  assert.equal(decideProjectAccess('write', ctx), false);
});

// Non-member on a private project: nothing.
test('outsider on private: read + write denied', () => {
  const ctx = { isOwner: false, memberAccess: null, visibility: 'private' as const };
  assert.equal(decideProjectAccess('read', ctx), false);
  assert.equal(decideProjectAccess('write', ctx), false);
});

// Non-member on a public project: read only.
test('outsider on public: read allowed, write denied', () => {
  const ctx = { isOwner: false, memberAccess: null, visibility: 'public' as const };
  assert.equal(decideProjectAccess('read', ctx), true);
  assert.equal(decideProjectAccess('write', ctx), false);
});

// A 'shared' visibility alone (no membership) grants nothing to an outsider —
// sharing is membership-driven, not visibility-driven.
test('outsider on shared (no membership): read + write denied', () => {
  const ctx = { isOwner: false, memberAccess: null, visibility: 'shared' as const };
  assert.equal(decideProjectAccess('read', ctx), false);
  assert.equal(decideProjectAccess('write', ctx), false);
});

// Public visibility never elevates a view-member to write.
test('member view on public: write still denied', () => {
  const ctx = { isOwner: false, memberAccess: 'view' as const, visibility: 'public' as const };
  assert.equal(decideProjectAccess('write', ctx), false);
});
