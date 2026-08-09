import { hmacSha256, toHex, hexToBytes, stableStringify } from './cryptoutil.mjs';

function identifier(t) {
  return stableStringify({ id: t.id, agent: t.agent, fields: t.fields, purpose: t.purpose, expiresAt: t.expiresAt });
}

export async function mint(secretHex, { id, agent, fields, purpose, expiresAt }) {
  const token = { id, agent, fields: [...fields], purpose, expiresAt, caveats: [] };
  const sig = await hmacSha256(hexToBytes(secretHex), identifier(token));
  token.sig = toHex(sig);
  return token;
}

export async function attenuate(token, caveat) {
  const next = { fields: caveat.fields ? [...caveat.fields] : undefined, expiresAt: caveat.expiresAt };
  const sig = await hmacSha256(hexToBytes(token.sig), stableStringify(next));
  return { ...token, caveats: [...token.caveats, next], sig: toHex(sig) };
}

export async function verify(secretHex, token) {
  let sig = await hmacSha256(hexToBytes(secretHex), identifier(token));
  for (const c of token.caveats) {
    sig = await hmacSha256(sig, stableStringify({ fields: c.fields, expiresAt: c.expiresAt }));
  }
  const ok = toHex(sig) === token.sig;

  let fields = new Set(token.fields);
  let expiresAt = token.expiresAt;
  for (const c of token.caveats) {
    if (c.fields) fields = new Set([...fields].filter((f) => c.fields.includes(f)));
    if (typeof c.expiresAt === 'number') expiresAt = Math.min(expiresAt, c.expiresAt);
  }
  return { ok, fields: [...fields], purpose: token.purpose, expiresAt };
}
