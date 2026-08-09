import { verify } from './token.mjs';

export function createAuthServer(secretHex) {
  const registry = new Map();
  return {
    register(token) { registry.set(token.id, 'active'); },
    revoke(id) { if (registry.has(id)) registry.set(id, 'revoked'); },
    status(id) { return registry.get(id) ?? 'unknown'; },
    async check(token, field, purpose, now = Date.now()) {
      const v = await verify(secretHex, token);
      if (!v.ok) return { decision: 'DENY', reason: 'bad-signature' };
      if (registry.get(token.id) !== 'active') return { decision: 'DENY', reason: 'revoked' };
      if (now > v.expiresAt) return { decision: 'DENY', reason: 'expired' };
      if (purpose !== v.purpose) return { decision: 'DENY', reason: 'purpose-mismatch' };
      if (!v.fields.includes(field)) return { decision: 'DENY', reason: 'out-of-scope' };
      return { decision: 'ALLOW' };
    },
  };
}
