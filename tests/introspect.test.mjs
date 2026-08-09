import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mint } from '../src/token.mjs';
import { createAuthServer } from '../src/introspect.mjs';
import { createBroker } from '../src/broker.mjs';
import { createPassport } from '../src/passport.mjs';

const SECRET = 'a1b2c3d4e5f6a7b8';

async function setup() {
  const auth = createAuthServer(SECRET);
  const passport = createPassport();
  const broker = createBroker({ passport, auth });
  const token = await mint(SECRET, { id: 'tok1', agent: 'BenefitBot', fields: ['national_id', 'diagnosis_code'], purpose: 'benefit_claim', expiresAt: Date.now() + 60_000 });
  auth.register(token);
  return { auth, broker, token };
}

test('in-scope read is allowed and returns the value', async () => {
  const { broker, token } = await setup();
  const r = await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot');
  assert.equal(r.ok, true);
  assert.equal(r.value, 'ICD-10 G35');
});

test('out-of-scope read is denied', async () => {
  const { broker, token } = await setup();
  const r = await broker.read(token, 'full_medical_history', 'benefit_claim', 'HelperBot');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'out-of-scope');
});

test('purpose mismatch is denied', async () => {
  const { broker, token } = await setup();
  const r = await broker.read(token, 'diagnosis_code', 'marketing', 'BenefitBot');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'purpose-mismatch');
});

test('read after revoke is denied — provably', async () => {
  const { auth, broker, token } = await setup();
  assert.equal((await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot')).ok, true);
  auth.revoke(token.id);
  const after = await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot');
  assert.equal(after.ok, false);
  assert.equal(after.reason, 'revoked');
});

test('expired token is denied', async () => {
  const auth = createAuthServer(SECRET);
  const passport = createPassport();
  const broker = createBroker({ passport, auth });
  const token = await mint(SECRET, { id: 'old', agent: 'BenefitBot', fields: ['diagnosis_code'], purpose: 'benefit_claim', expiresAt: 1000 });
  auth.register(token);
  const r = await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot');
  assert.equal(r.reason, 'expired');
});
