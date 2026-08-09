import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mint, attenuate, verify } from '../src/token.mjs';

const SECRET = 'a1b2c3d4e5f6a7b8';
const base = { id: 'tok1', agent: 'BenefitBot', fields: ['national_id', 'monthly_income', 'diagnosis_code'], purpose: 'benefit_claim', expiresAt: 10_000 };

test('a freshly minted token verifies', async () => {
  const t = await mint(SECRET, base);
  const v = await verify(SECRET, t);
  assert.equal(v.ok, true);
  assert.deepEqual(v.fields.sort(), ['diagnosis_code', 'monthly_income', 'national_id']);
  assert.equal(v.expiresAt, 10_000);
});

test('tampering with root fields breaks verification', async () => {
  const t = await mint(SECRET, base);
  t.fields = [...t.fields, 'payment_history'];
  const v = await verify(SECRET, t);
  assert.equal(v.ok, false);
});

test('attenuation narrows fields and cannot widen', async () => {
  const t = await mint(SECRET, base);
  const narrowed = await attenuate(t, { fields: ['diagnosis_code'] });
  const v = await verify(SECRET, narrowed);
  assert.equal(v.ok, true);
  assert.deepEqual(v.fields, ['diagnosis_code']);

  const widened = await attenuate(t, { fields: ['national_id', 'monthly_income', 'diagnosis_code', 'payment_history'] });
  const vw = await verify(SECRET, widened);
  assert.equal(vw.ok, true);
  assert.equal(vw.fields.includes('payment_history'), false);
});

test('attenuation shortens expiry, never extends', async () => {
  const t = await mint(SECRET, base);
  const short = await attenuate(t, { expiresAt: 500 });
  assert.equal((await verify(SECRET, short)).expiresAt, 500);
  const long = await attenuate(t, { expiresAt: 99_999 });
  assert.equal((await verify(SECRET, long)).expiresAt, 10_000);
});

test('wrong secret fails verification', async () => {
  const t = await mint(SECRET, base);
  assert.equal((await verify('deadbeef', t)).ok, false);
});
