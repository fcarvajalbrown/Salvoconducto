import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, runScenario, BENEFIT_REQUEST, HELPER_OVERASK } from '../src/scenario.mjs';

test('the five-beat scenario behaves as designed', async () => {
  const world = await createWorld();
  const trace = await runScenario(world);

  assert.deepEqual(BENEFIT_REQUEST.fields, ['identity.national_id', 'income.monthly', 'health.diagnosis_code']);
  assert.equal(trace.reads.filter((r) => r.ok).length, 3);
  assert.equal(trace.overAsk.ok, false);
  assert.equal(trace.overAsk.reason, 'out-of-scope');
  assert.equal(trace.probe.ok, false);
  assert.equal(trace.probe.reason, 'revoked');
  assert.equal(world.auth.status(trace.revoke.tokenId), 'revoked');
  assert.equal((await world.ledger.verifyChain()).ok, true);
});

test('exposure is minimized and reported honestly', async () => {
  const world = await createWorld();
  const trace = await runScenario(world);
  assert.ok(trace.exposure.count >= 1);
  assert.ok(trace.exposure.sensitiveFieldsRead.includes('health.diagnosis_code'));
  assert.equal(trace.exposure.sensitiveFieldsRead.includes('health.full_history'), false);
});
