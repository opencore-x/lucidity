import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomRegistry, type PeerSocket } from './registry.js';

/** A fake socket that records what it received and whether it was closed. */
function fakeSocket() {
  const sent: Array<string | ArrayBuffer | Uint8Array> = [];
  let closedWith: number | undefined;
  const sock: PeerSocket & { sent: typeof sent; closedWith: () => number | undefined } = {
    send: (d) => sent.push(d),
    close: (code) => {
      closedWith = code;
    },
    sent,
    closedWith: () => closedWith,
  };
  return sock;
}

test('forward bridges phone -> daemon and daemon -> phone by userId', () => {
  const reg = new RoomRegistry();
  const phone = fakeSocket();
  const daemon = fakeSocket();
  reg.join('u1', 'phone', phone);
  reg.join('u1', 'daemon', daemon);

  assert.equal(reg.forward('u1', 'phone', 'cipher-A'), true);
  assert.equal(reg.forward('u1', 'daemon', 'cipher-B'), true);
  assert.deepEqual(daemon.sent, ['cipher-A']);
  assert.deepEqual(phone.sent, ['cipher-B']);
});

test('forward is opaque — bytes pass through untouched', () => {
  const reg = new RoomRegistry();
  const phone = fakeSocket();
  const daemon = fakeSocket();
  reg.join('u1', 'phone', phone);
  reg.join('u1', 'daemon', daemon);

  const bytes = new Uint8Array([1, 2, 3, 255]);
  reg.forward('u1', 'phone', bytes);
  assert.equal(daemon.sent[0], bytes); // same reference, never copied/parsed
});

test('forward does not cross users', () => {
  const reg = new RoomRegistry();
  const d1 = fakeSocket();
  const d2 = fakeSocket();
  reg.join('u1', 'daemon', d1);
  reg.join('u2', 'daemon', d2);
  reg.join('u1', 'phone', fakeSocket());

  reg.forward('u1', 'phone', 'for-u1');
  assert.deepEqual(d1.sent, ['for-u1']);
  assert.deepEqual(d2.sent, []);
});

test('forward returns false when the counterpart is absent', () => {
  const reg = new RoomRegistry();
  reg.join('u1', 'phone', fakeSocket());
  assert.equal(reg.forward('u1', 'phone', 'x'), false);
});

test('reconnect: a new same-role peer replaces and closes the old one', () => {
  const reg = new RoomRegistry();
  const oldPhone = fakeSocket();
  const newPhone = fakeSocket();
  const daemon = fakeSocket();
  reg.join('u1', 'phone', oldPhone);
  reg.join('u1', 'daemon', daemon);
  reg.join('u1', 'phone', newPhone);

  assert.equal(oldPhone.closedWith(), 4409);
  reg.forward('u1', 'daemon', 'hello');
  assert.deepEqual(newPhone.sent, ['hello']);
  assert.deepEqual(oldPhone.sent, []);
});

test('leave from a superseded socket does not evict the live one', () => {
  const reg = new RoomRegistry();
  const oldPhone = fakeSocket();
  const newPhone = fakeSocket();
  reg.join('u1', 'phone', oldPhone);
  reg.join('u1', 'phone', newPhone); // supersedes old
  reg.leave('u1', 'phone', oldPhone); // late close from the old conn

  const daemon = fakeSocket();
  reg.join('u1', 'daemon', daemon);
  assert.equal(reg.forward('u1', 'daemon', 'still-here'), true);
  assert.deepEqual(newPhone.sent, ['still-here']);
});

test('stats counts users, peers, and paired rooms', () => {
  const reg = new RoomRegistry();
  reg.join('u1', 'phone', fakeSocket());
  reg.join('u1', 'daemon', fakeSocket());
  reg.join('u2', 'daemon', fakeSocket());
  assert.deepEqual(reg.stats(), { users: 2, phones: 1, daemons: 2, paired: 1 });
});

test('room entry is freed when both peers leave', () => {
  const reg = new RoomRegistry();
  const phone = fakeSocket();
  const daemon = fakeSocket();
  reg.join('u1', 'phone', phone);
  reg.join('u1', 'daemon', daemon);
  reg.leave('u1', 'phone', phone);
  reg.leave('u1', 'daemon', daemon);
  assert.deepEqual(reg.stats(), { users: 0, phones: 0, daemons: 0, paired: 0 });
});
