import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mint } from '../src/token.mjs';
import { createAuthServer } from '../src/introspect.mjs';
import { createBroker } from '../src/broker.mjs';
import { createPassport } from '../src/passport.mjs';
import { createLedger } from '../src/receipts.mjs';

const SECRET = 'a1b2c3d4e5f6a7b8';

async function setup() {
  const auth = createAuthServer(SECRET);
  const passport = createPassport();
  const ledger = createLedger();
  const broker = createBroker({ passport, auth, ledger, salt: 'testsalt' });
  const token = await mint(SECRET, { id: 't', agent: 'BenefitBot', fields: ['diagnosis_code'], purpose: 'benefit_claim', expiresAt: Date.now() + 60_000 });
  auth.register(token);
  return { broker, token, ledger };
}

test('the agent still receives the real value', async () => {
  const { broker, token } = await setup();
  const r = await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot');
  assert.equal(r.value, 'ICD-10 G35');
});

test('the ledger stores a salted hash, never the raw value', async () => {
  const { broker, token, ledger } = await setup();
  await broker.read(token, 'diagnosis_code', 'benefit_claim', 'BenefitBot');
  const e = ledger.all()[0];
  assert.equal(e.value, undefined);
  assert.equal(typeof e.valueHash, 'string');
  assert.equal(e.valueHash.length, 64);
  assert.ok(e.redacted);
  assert.equal(e.redacted.includes('ICD-10 G35'), false);
});

test('denied reads log the reason, no value or hash', async () => {
  const { broker, token, ledger } = await setup();
  await broker.read(token, 'payment_history', 'benefit_claim', 'HelperBot');
  const e = ledger.all()[0];
  assert.equal(e.decision, 'DENY');
  assert.equal(e.reason, 'out-of-scope');
  assert.equal(e.valueHash, undefined);
});
