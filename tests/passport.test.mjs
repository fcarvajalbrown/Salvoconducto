import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPassport } from '../src/passport.mjs';

test('passport exposes fields with sensitivity and topics', () => {
  const p = createPassport();
  assert.ok(p.count() >= 18);
  const id = p.meta('national_id');
  assert.equal(id.topic, 'Identity');
  assert.equal(id.sensitivity, 'high');
  assert.equal(typeof p.get('national_id'), 'string');
});

test('unknown field returns undefined', () => {
  const p = createPassport();
  assert.equal(p.get('nope'), undefined);
  assert.equal(p.meta('nope'), undefined);
});

test('list is a copy, not the internal array', () => {
  const p = createPassport();
  const a = p.list();
  a.push({ key: 'x' });
  assert.equal(p.list().length, p.count());
});
