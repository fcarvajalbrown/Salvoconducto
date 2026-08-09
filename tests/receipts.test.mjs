import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '../src/receipts.mjs';

test('chain verifies for honest entries', async () => {
  const l = createLedger();
  await l.append({ actor: 'BenefitBot', action: 'read', field: 'diagnosis_code', purpose: 'benefit_claim', decision: 'ALLOW', value: 'ICD-10 G35' });
  await l.append({ actor: 'HelperBot', action: 'read', field: 'full_medical_history', purpose: 'benefit_claim', decision: 'DENY', reason: 'out-of-scope' });
  const v = await l.verifyChain();
  assert.equal(v.ok, true);
  assert.equal(l.all().length, 2);
  assert.equal(l.all()[0].prevHash, '0'.repeat(64));
  assert.equal(l.all()[1].prevHash, l.all()[0].hash);
});

test('tampering with a past entry is detected', async () => {
  const l = createLedger();
  await l.append({ actor: 'BenefitBot', action: 'read', field: 'diagnosis_code', purpose: 'benefit_claim', decision: 'ALLOW', value: 'ICD-10 G35' });
  await l.append({ actor: 'BenefitBot', action: 'read', field: 'monthly_income', purpose: 'benefit_claim', decision: 'ALLOW', value: 'CLP 520.000' });
  l.all()[0].value = 'ICD-10 F00';
  const v = await l.verifyChain();
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt, 0);
});

test('export produces a consent-receipt-style object', async () => {
  const l = createLedger();
  await l.append({ actor: 'BenefitBot', action: 'read', field: 'diagnosis_code', purpose: 'benefit_claim', decision: 'ALLOW', value: 'ICD-10 G35' });
  const doc = l.export();
  assert.equal(doc.receiptCount, 1);
  assert.ok(Array.isArray(doc.entries));
  assert.equal(doc.entries[0].field, 'diagnosis_code');
});
