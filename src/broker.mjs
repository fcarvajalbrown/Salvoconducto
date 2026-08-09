import { sha256hex, randomHex } from './cryptoutil.mjs';

function redact(v) {
  const s = String(v);
  if (s.length <= 4) return '••••';
  return s.slice(0, 2) + '•'.repeat(Math.min(8, Math.max(3, s.length - 4))) + s.slice(-2);
}

export function createBroker({ passport, auth, ledger, salt }) {
  const s = salt ?? randomHex(8);
  return {
    async read(token, field, purpose, actor, now = Date.now()) {
      const res = await auth.check(token, field, purpose, now);
      if (res.decision === 'ALLOW') {
        const value = passport.get(field);
        if (ledger) {
          const valueHash = await sha256hex(s + '|' + field + '|' + value);
          await ledger.append({ actor, action: 'read', field, purpose, decision: 'ALLOW', valueHash, redacted: redact(value) });
        }
        return { ok: true, value };
      }
      if (ledger) await ledger.append({ actor, action: 'read', field, purpose, decision: 'DENY', reason: res.reason });
      return { ok: false, reason: res.reason };
    },
  };
}
