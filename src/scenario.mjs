import { createPassport } from './passport.mjs';
import { createAuthServer } from './introspect.mjs';
import { createLedger } from './receipts.mjs';
import { createBroker } from './broker.mjs';
import { mint } from './token.mjs';
import { randomHex } from './cryptoutil.mjs';

export const BENEFIT_REQUEST = {
  agent: 'BenefitBot',
  task: 'File disability benefit claim',
  fields: ['identity.national_id', 'income.monthly', 'health.diagnosis_code'],
  purpose: 'benefit_claim',
  ttlMs: 30 * 60 * 1000,
};

export const HELPER_OVERASK = { agent: 'HelperBot', field: 'health.full_history', purpose: 'benefit_claim' };

export async function createWorld(secretHex) {
  const secret = secretHex ?? randomHex(16);
  const passport = createPassport();
  const auth = createAuthServer(secret);
  const ledger = createLedger();
  const broker = createBroker({ passport, auth, ledger });
  async function mintGrant(fields, ttlMs) {
    const token = await mint(secret, {
      id: randomHex(8),
      agent: BENEFIT_REQUEST.agent,
      fields,
      purpose: BENEFIT_REQUEST.purpose,
      expiresAt: Date.now() + ttlMs,
    });
    auth.register(token);
    return token;
  }
  return { passport, auth, ledger, broker, mintGrant };
}

export function exposure(ledger, passport) {
  const sensitive = new Set();
  for (const e of ledger.all()) {
    if (e.action === 'read' && e.decision === 'ALLOW' && passport.meta(e.field)?.sensitivity === 'high') {
      sensitive.add(e.field);
    }
  }
  return { sensitiveFieldsRead: [...sensitive], count: sensitive.size };
}

export async function runScenario(world) {
  const token = await world.mintGrant(BENEFIT_REQUEST.fields, BENEFIT_REQUEST.ttlMs);
  const reads = [];
  for (const f of BENEFIT_REQUEST.fields) {
    reads.push(await world.broker.read(token, f, BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent));
  }
  const overAsk = await world.broker.read(token, HELPER_OVERASK.field, HELPER_OVERASK.purpose, HELPER_OVERASK.agent);
  world.auth.revoke(token.id);
  const probe = await world.broker.read(token, 'health.diagnosis_code', BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
  return {
    grants: [token],
    reads,
    overAsk,
    revoke: { tokenId: token.id },
    probe,
    exposure: exposure(world.ledger, world.passport),
  };
}
