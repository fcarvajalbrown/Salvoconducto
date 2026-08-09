import { sha256hex, stableStringify } from './cryptoutil.mjs';

const GENESIS = '0'.repeat(64);

export function createLedger() {
  const entries = [];
  let prevHash = GENESIS;
  let seq = 0;

  async function hashOf(entryNoHash) {
    return sha256hex(stableStringify(entryNoHash));
  }

  return {
    async append(e) {
      const body = { seq: seq++, ts: Date.now(), ...e, prevHash };
      const hash = await hashOf(body);
      const entry = { ...body, hash };
      entries.push(entry);
      prevHash = hash;
      return { ...entry };
    },
    all() { return entries; },
    async verifyChain() {
      let prev = GENESIS;
      for (let i = 0; i < entries.length; i++) {
        const { hash, ...body } = entries[i];
        if (body.prevHash !== prev) return { ok: false, brokenAt: i };
        if ((await hashOf(body)) !== hash) return { ok: false, brokenAt: i };
        prev = hash;
      }
      return { ok: true };
    },
    export() {
      return {
        standard: 'salvoconducto/consent-receipt/0.1',
        receiptCount: entries.length,
        headHash: prevHash,
        entries: entries.map((e) => ({ ...e })),
      };
    },
  };
}
