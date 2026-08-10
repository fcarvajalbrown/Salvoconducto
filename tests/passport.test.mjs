import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPassport } from '../src/passport.mjs';

test('passport exposes fields with sensitivity and a category', () => {
  const p = createPassport();
  assert.ok(p.count() >= 18);
  const id = p.meta('identity.national_id');
  assert.equal(id.category, 'identity');
  assert.equal(id.categoryLabel, 'Identity');
  assert.equal(id.sensitivity, 'high');
  assert.equal(typeof p.get('identity.national_id'), 'string');
});

test('every field key is a dotted path under a declared category', () => {
  const p = createPassport();
  const declared = new Set(p.categories().map((c) => c.id));
  assert.equal(declared.size, p.categoryCount());
  for (const f of p.list()) {
    assert.match(f.key, /^[a-z]+\.[a-z0-9_]+$/, `not a dotted path: ${f.key}`);
    assert.ok(declared.has(f.category), `undeclared category: ${f.category}`);
  }
});

test('categories partition the field set', () => {
  const p = createPassport();
  const grouped = p.categories().flatMap((c) => c.fields.map((f) => f.key));
  assert.equal(grouped.length, p.count());
  assert.equal(new Set(grouped).size, p.count());
  for (const c of p.categories()) assert.ok(c.fields.length > 0, `empty category: ${c.id}`);
});

test('the flat key namespace is gone', () => {
  const p = createPassport();
  assert.equal(p.get('national_id'), undefined);
  assert.equal(p.meta('diagnosis_code'), undefined);
});

test('unknown field returns undefined', () => {
  const p = createPassport();
  assert.equal(p.get('nope'), undefined);
  assert.equal(p.meta('nope'), undefined);
  assert.equal(p.categoryOf('nope'), undefined);
});

test('list is a copy, not the internal array', () => {
  const p = createPassport();
  const a = p.list();
  a.push({ key: 'x' });
  assert.equal(p.list().length, p.count());
});
