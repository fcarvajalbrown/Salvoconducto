# Salvoconducto Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Salvoconducto demo — a self-contained web app where an AI agent is granted a scoped, purpose-bound, time-limited capability token to your AI Passport data, every read is logged to a tamper-evident ledger, and revocation is *proven* dead by a live probe.

**Architecture:** Dependency-free ES modules. The three security primitives (capability token, introspection-revocation, hash-chained receipts) are implemented with the browser/Node Web Crypto API (`globalThis.crypto.subtle`) and unit-tested in Node's built-in test runner. The UI renders entirely from JS into a single `#app` root. A dependency-free build step inlines everything into one body-only HTML file for publishing as an Artifact.

**Tech Stack:** Vanilla JavaScript (`.mjs` ES modules), Web Crypto API, Node built-in `node:test` + `node:assert`, no third-party packages, no bundler.

## Global Constraints

- **Zero third-party dependencies.** No `npm install`, no bundler, no framework. Only Node built-ins and Web Crypto. (Files may be run with `node`; nothing is fetched.)
- **Self-contained + offline.** No network calls at runtime. The built artifact must reference no external host (Artifact CSP blocks them anyway).
- **NO COMMENTS IN CODE.** Every file, every language. If code needs explaining, rename or restructure.
- **Bilingual EN/ES.** All user-facing copy comes from `src/strings/en.mjs` and `src/strings/es.mjs`, kept at key parity. Default language English; a toggle switches to Spanish.
- **Theme-aware.** CSS must style both light and dark via `prefers-color-scheme` and `:root[data-theme=...]`.
- **Conventional Commits, no AI attribution.** No `Co-Authored-By`, no "generated with" lines. Commit and push to `origin main` after each task.
- **Node 18+** required (Web Crypto on `globalThis`, `node:test`). Run tests with `node --test`.
- **Deterministic agents.** No live LLM calls; the scenario is scripted so the demo is reproducible.

---

### Task 1: Scaffold + crypto utilities + Passport model

**Files:**
- Create: `salvoconducto/src/cryptoutil.mjs`
- Create: `salvoconducto/src/passport.mjs`
- Test: `salvoconducto/tests/cryptoutil.test.mjs`
- Test: `salvoconducto/tests/passport.test.mjs`

**Interfaces:**
- Produces: `toHex(Uint8Array)->string`, `hexToBytes(string)->Uint8Array`, `hmacSha256(Uint8Array,string)->Promise<Uint8Array>`, `sha256hex(string)->Promise<string>`, `randomHex(n)->string`, `stableStringify(any)->string`.
- Produces: `createPassport()->{ list()->Field[], get(key)->string|undefined, meta(key)->Field|undefined, count()->number }` where `Field = {key, topic, sensitivity, value, label}`.

- [ ] **Step 1: Write the failing test for cryptoutil**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toHex, hexToBytes, hmacSha256, sha256hex, stableStringify } from '../src/cryptoutil.mjs';

test('hex round-trips', () => {
  const bytes = new Uint8Array([0, 15, 16, 255]);
  assert.equal(toHex(bytes), '000f10ff');
  assert.deepEqual([...hexToBytes('000f10ff')], [0, 15, 16, 255]);
});

test('hmac is deterministic and keyed', async () => {
  const key = hexToBytes('aabbcc');
  const a = toHex(await hmacSha256(key, 'msg'));
  const b = toHex(await hmacSha256(key, 'msg'));
  const c = toHex(await hmacSha256(hexToBytes('ffee'), 'msg'));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('sha256hex known vector', async () => {
  assert.equal(await sha256hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('stableStringify sorts keys deterministically', () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
  assert.equal(stableStringify({ a: 2, b: 1 }), '{"a":2,"b":1}');
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd salvoconducto && node --test tests/cryptoutil.test.mjs`
Expected: FAIL — cannot find module `../src/cryptoutil.mjs`.

- [ ] **Step 3: Implement `src/cryptoutil.mjs`**

```javascript
const enc = new TextEncoder();

export function toHex(bytes) {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function hexToBytes(hex) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return a;
}

export async function hmacSha256(keyBytes, msg) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return new Uint8Array(sig);
}

export async function sha256hex(msg) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(msg));
  return toHex(new Uint8Array(h));
}

export function randomHex(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return toHex(b);
}

export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}
```

- [ ] **Step 4: Run cryptoutil test, verify pass**

Run: `node --test tests/cryptoutil.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for passport**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPassport } from '../src/passport.mjs';

test('passport exposes fields with sensitivity and topics', () => {
  const p = createPassport();
  assert.ok(p.count() >= 18);
  const id = p.meta('national_id');
  assert.equal(id.topic, 'Identity');
  assert.equal(id.sensitivity, 'high');
  assert.equal(typeof p.get('national_id'), 'string');
});

test('unknown field returns undefined', () => {
  const p = createPassport();
  assert.equal(p.get('nope'), undefined);
  assert.equal(p.meta('nope'), undefined);
});

test('list is a copy, not the internal array', () => {
  const p = createPassport();
  const a = p.list();
  a.push({ key: 'x' });
  assert.equal(p.list().length, p.count());
});
```

- [ ] **Step 6: Run it, verify it fails**

Run: `node --test tests/passport.test.mjs`
Expected: FAIL — cannot find module `../src/passport.mjs`.

- [ ] **Step 7: Implement `src/passport.mjs`**

```javascript
const FIELDS = [
  { key: 'national_id', topic: 'Identity', sensitivity: 'high', label: 'National ID', value: '12.345.678-9' },
  { key: 'full_name', topic: 'Identity', sensitivity: 'medium', label: 'Full name', value: 'Ana Rojas Pérez' },
  { key: 'date_of_birth', topic: 'Identity', sensitivity: 'medium', label: 'Date of birth', value: '1979-04-11' },
  { key: 'home_address', topic: 'Identity', sensitivity: 'high', label: 'Home address', value: 'Av. Grecia 1234, Ñuñoa' },
  { key: 'phone', topic: 'Contacts', sensitivity: 'medium', label: 'Phone', value: '+56 9 8765 4321' },
  { key: 'email', topic: 'Contacts', sensitivity: 'low', label: 'Email', value: 'ana.rojas@example.cl' },
  { key: 'emergency_contact', topic: 'Contacts', sensitivity: 'medium', label: 'Emergency contact', value: 'M. Rojas +56 9 5555 1212' },
  { key: 'monthly_income', topic: 'Income', sensitivity: 'high', label: 'Monthly income', value: 'CLP 520.000' },
  { key: 'employer', topic: 'Income', sensitivity: 'medium', label: 'Employer', value: 'Independent' },
  { key: 'tax_id', topic: 'Income', sensitivity: 'high', label: 'Tax ID', value: '12.345.678-9' },
  { key: 'bank_account', topic: 'Payment', sensitivity: 'high', label: 'Bank account', value: 'Ch** **** **** 4417' },
  { key: 'card_last4', topic: 'Payment', sensitivity: 'medium', label: 'Card (last 4)', value: '4417' },
  { key: 'payment_history', topic: 'Payment', sensitivity: 'high', label: 'Payment history', value: '36 months of transactions' },
  { key: 'diagnosis_code', topic: 'Health', sensitivity: 'high', label: 'Diagnosis code', value: 'ICD-10 G35' },
  { key: 'full_medical_history', topic: 'Health', sensitivity: 'high', label: 'Full medical history', value: '14 years of records' },
  { key: 'medications', topic: 'Health', sensitivity: 'high', label: 'Medications', value: 'ocrelizumab' },
  { key: 'blood_type', topic: 'Health', sensitivity: 'medium', label: 'Blood type', value: 'O+' },
  { key: 'disability_percent', topic: 'Health', sensitivity: 'high', label: 'Disability rating', value: '45%' },
  { key: 'calendar_today', topic: 'Schedule', sensitivity: 'low', label: "Today's calendar", value: '2 events' },
  { key: 'location', topic: 'Schedule', sensitivity: 'medium', label: 'Location', value: 'Santiago, CL' },
];

export function createPassport() {
  const map = new Map(FIELDS.map((f) => [f.key, f]));
  return {
    list() { return FIELDS.map((f) => ({ ...f })); },
    get(key) { return map.get(key)?.value; },
    meta(key) { const f = map.get(key); return f ? { ...f } : undefined; },
    count() { return FIELDS.length; },
  };
}
```

- [ ] **Step 8: Run passport test, verify pass**

Run: `node --test tests/passport.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit and push**

```bash
git add salvoconducto/src/cryptoutil.mjs salvoconducto/src/passport.mjs salvoconducto/tests/cryptoutil.test.mjs salvoconducto/tests/passport.test.mjs
git commit -m "feat(salvoconducto): crypto utilities and Passport data model"
git push origin main
```

---

### Task 2: Capability token (Macaroon-style, attenuable)

**Files:**
- Create: `salvoconducto/src/token.mjs`
- Test: `salvoconducto/tests/token.test.mjs`

**Interfaces:**
- Consumes: `hmacSha256`, `toHex`, `hexToBytes` from `cryptoutil.mjs`.
- Produces:
  - `mint(secretHex, {id, agent, fields, purpose, expiresAt})->Promise<Token>`
  - `attenuate(token, {fields?, expiresAt?})->Promise<Token>`
  - `verify(secretHex, token)->Promise<{ok, fields, purpose, expiresAt}>`
  - `Token = {id, agent, fields, purpose, expiresAt, caveats, sig}`.
- Rule: `verify` computes *effective* scope as the intersection of the root fields and every caveat's fields, and the minimum expiry. Attenuation can only narrow; a caveat that names extra fields cannot widen scope.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/token.test.mjs`
Expected: FAIL — cannot find module `../src/token.mjs`.

- [ ] **Step 3: Implement `src/token.mjs`**

```javascript
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
```

- [ ] **Step 4: Run token test, verify pass**

Run: `node --test tests/token.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit and push**

```bash
git add salvoconducto/src/token.mjs salvoconducto/tests/token.test.mjs
git commit -m "feat(salvoconducto): attenuable capability token with HMAC caveat chain"
git push origin main
```

---

### Task 3: Introspection authorization server + broker

**Files:**
- Create: `salvoconducto/src/introspect.mjs`
- Create: `salvoconducto/src/broker.mjs`
- Test: `salvoconducto/tests/introspect.test.mjs`

**Interfaces:**
- Consumes: `verify` from `token.mjs`; `createPassport` from `passport.mjs`.
- Produces: `createAuthServer(secretHex)->{ register(token), revoke(id), status(id)->'active'|'revoked'|'unknown', check(token, field, purpose, now?)->Promise<{decision:'ALLOW'|'DENY', reason?}> }`.
- Produces: `createBroker({passport, auth, ledger})->{ read(token, field, purpose, actor)->Promise<{ok, value?, reason?}> }`. When `ledger` is provided, every read appends a receipt (Task 4); it is optional so this task can be tested without the ledger.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/introspect.test.mjs`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Implement `src/introspect.mjs`**

```javascript
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
```

- [ ] **Step 4: Implement `src/broker.mjs`**

```javascript
export function createBroker({ passport, auth, ledger }) {
  return {
    async read(token, field, purpose, actor, now = Date.now()) {
      const res = await auth.check(token, field, purpose, now);
      if (res.decision === 'ALLOW') {
        const value = passport.get(field);
        if (ledger) await ledger.append({ actor, action: 'read', field, purpose, decision: 'ALLOW', value });
        return { ok: true, value };
      }
      if (ledger) await ledger.append({ actor, action: 'read', field, purpose, decision: 'DENY', reason: res.reason });
      return { ok: false, reason: res.reason };
    },
  };
}
```

- [ ] **Step 5: Run introspect test, verify pass**

Run: `node --test tests/introspect.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit and push**

```bash
git add salvoconducto/src/introspect.mjs salvoconducto/src/broker.mjs salvoconducto/tests/introspect.test.mjs
git commit -m "feat(salvoconducto): introspection authz server and read broker"
git push origin main
```

---

### Task 4: Hash-chained receipt ledger

**Files:**
- Create: `salvoconducto/src/receipts.mjs`
- Test: `salvoconducto/tests/receipts.test.mjs`

**Interfaces:**
- Consumes: `sha256hex`, `stableStringify` from `cryptoutil.mjs`.
- Produces: `createLedger()->{ append(entry)->Promise<Receipt>, all()->Receipt[], verifyChain()->Promise<{ok, brokenAt?}>, export()->object }`.
- `Receipt = { seq, ts, actor, action, field?, purpose?, decision, value?, reason?, prevHash, hash }`. `hash = sha256hex(stableStringify(entry-without-hash))`; genesis `prevHash` is 64 zeroes.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/receipts.test.mjs`
Expected: FAIL — cannot find module `../src/receipts.mjs`.

- [ ] **Step 3: Implement `src/receipts.mjs`**

```javascript
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
```

- [ ] **Step 4: Run receipts test, verify pass**

Run: `node --test tests/receipts.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit and push**

```bash
git add salvoconducto/src/receipts.mjs salvoconducto/tests/receipts.test.mjs
git commit -m "feat(salvoconducto): hash-chained tamper-evident receipt ledger"
git push origin main
```

---

### Task 5: Scripted scenario (agents + full flow)

**Files:**
- Create: `salvoconducto/src/scenario.mjs`
- Test: `salvoconducto/tests/scenario.test.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `BENEFIT_REQUEST = { agent, task, fields, purpose, ttlMs }` and `HELPER_OVERASK = { agent, field, purpose }` constants.
  - `createWorld(secretHex?)->{ passport, auth, ledger, broker, mintGrant(fields, ttlMs)->Promise<Token> }`.
  - `runScenario(world)->Promise<{ grants, reads, overAsk, revoke, probe, exposure }>` — drives the five beats deterministically and returns a structured trace the UI and tests can assert on.
  - `exposure(ledger)->{ sensitiveFieldsRead: string[], count }` computed from ALLOW read receipts of high-sensitivity fields.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, runScenario, BENEFIT_REQUEST, HELPER_OVERASK } from '../src/scenario.mjs';

test('the five-beat scenario behaves as designed', async () => {
  const world = await createWorld();
  const trace = await runScenario(world);

  assert.deepEqual(BENEFIT_REQUEST.fields, ['national_id', 'monthly_income', 'diagnosis_code']);
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
  assert.ok(trace.exposure.sensitiveFieldsRead.includes('diagnosis_code'));
  assert.equal(trace.exposure.sensitiveFieldsRead.includes('full_medical_history'), false);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/scenario.test.mjs`
Expected: FAIL — cannot find module `../src/scenario.mjs`.

- [ ] **Step 3: Implement `src/scenario.mjs`**

```javascript
import { createPassport } from './passport.mjs';
import { createAuthServer } from './introspect.mjs';
import { createLedger } from './receipts.mjs';
import { createBroker } from './broker.mjs';
import { mint } from './token.mjs';
import { randomHex } from './cryptoutil.mjs';

export const BENEFIT_REQUEST = {
  agent: 'BenefitBot',
  task: 'File disability benefit claim',
  fields: ['national_id', 'monthly_income', 'diagnosis_code'],
  purpose: 'benefit_claim',
  ttlMs: 30 * 60 * 1000,
};

export const HELPER_OVERASK = { agent: 'HelperBot', field: 'full_medical_history', purpose: 'benefit_claim' };

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
  const probe = await world.broker.read(token, 'diagnosis_code', BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
  return {
    grants: [token],
    reads,
    overAsk,
    revoke: { tokenId: token.id },
    probe,
    exposure: exposure(world.ledger, world.passport),
  };
}
```

- [ ] **Step 4: Run scenario test, verify pass**

Run: `node --test tests/scenario.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS (all files, ~22 tests).

- [ ] **Step 6: Commit and push**

```bash
git add salvoconducto/src/scenario.mjs salvoconducto/tests/scenario.test.mjs
git commit -m "feat(salvoconducto): deterministic five-beat scenario driver"
git push origin main
```

---

### Task 6: Bilingual strings + parity test

**Files:**
- Create: `salvoconducto/src/strings/en.mjs`
- Create: `salvoconducto/src/strings/es.mjs`
- Create: `salvoconducto/src/i18n.mjs`
- Test: `salvoconducto/tests/parity.test.mjs`

**Interfaces:**
- Produces: `EN` and `ES` objects (flat `{key: string}`); `createI18n(initial='en')->{ t(key, vars?)->string, lang, setLang(code) }`. `t` substitutes `{name}` style vars.

- [ ] **Step 1: Write the failing parity test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN } from '../src/strings/en.mjs';
import { ES } from '../src/strings/es.mjs';
import { createI18n } from '../src/i18n.mjs';

test('EN and ES have identical key sets', () => {
  const ek = Object.keys(EN).sort();
  const sk = Object.keys(ES).sort();
  assert.deepEqual(ek, sk);
});

test('no empty translations', () => {
  for (const [k, v] of Object.entries(ES)) assert.ok(v.trim().length > 0, `empty ES: ${k}`);
});

test('i18n substitutes vars and switches language', () => {
  const i = createI18n('en');
  assert.equal(i.t('minimization', { n: 3, total: 20 }), EN.minimization.replace('{n}', '3').replace('{total}', '20'));
  i.setLang('es');
  assert.equal(i.lang, 'es');
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/parity.test.mjs`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Implement `src/strings/en.mjs`**

```javascript
export const EN = {
  title: 'Salvoconducto',
  tagline: 'A revoke button you can prove.',
  passportHeading: 'Your AI Passport',
  requestHeading: 'Access request',
  task: 'Task',
  requests: 'Requests',
  purpose: 'purpose',
  expiresIn: 'expires in',
  minimization: 'Minimizing: {n} of {total} fields requested',
  grant: 'Grant',
  editFields: 'Edit fields',
  deny: 'Deny',
  receiptsHeading: 'Live receipts',
  revoke: 'Revoke all',
  proveHeading: 'Proof of revocation',
  proveRun: 'Test it: probe a read now',
  proveDenied: 'DENIED — token revoked. Access is dead, not greyed out.',
  overAskFlag: 'Out of declared scope — blocked and logged',
  honestyHeading: 'What the agent already saw',
  honestyLine: '{field} entered the agent context and cannot be un-seen.',
  exposureLine: 'Exposure minimized: {count} sensitive field(s), {minutes} min.',
  chainOk: 'Receipt chain intact',
  chainBroken: 'Receipt chain broken',
  restart: 'Restart',
  langToggle: 'Español',
};
```

- [ ] **Step 4: Implement `src/strings/es.mjs`**

```javascript
export const ES = {
  title: 'Salvoconducto',
  tagline: 'Un botón de revocar que puedes probar.',
  passportHeading: 'Tu Pasaporte de IA',
  requestHeading: 'Solicitud de acceso',
  task: 'Tarea',
  requests: 'Pide',
  purpose: 'propósito',
  expiresIn: 'vence en',
  minimization: 'Minimizando: {n} de {total} campos solicitados',
  grant: 'Conceder',
  editFields: 'Editar campos',
  deny: 'Denegar',
  receiptsHeading: 'Recibos en vivo',
  revoke: 'Revocar todo',
  proveHeading: 'Prueba de revocación',
  proveRun: 'Compruébalo: sondea una lectura ahora',
  proveDenied: 'DENEGADO — token revocado. El acceso está muerto, no atenuado.',
  overAskFlag: 'Fuera del alcance declarado — bloqueado y registrado',
  honestyHeading: 'Lo que el agente ya vio',
  honestyLine: '{field} entró al contexto del agente y no se puede "des-ver".',
  exposureLine: 'Exposición minimizada: {count} campo(s) sensible(s), {minutes} min.',
  chainOk: 'Cadena de recibos íntegra',
  chainBroken: 'Cadena de recibos rota',
  restart: 'Reiniciar',
  langToggle: 'English',
};
```

- [ ] **Step 5: Implement `src/i18n.mjs`**

```javascript
import { EN } from './strings/en.mjs';
import { ES } from './strings/es.mjs';

const TABLES = { en: EN, es: ES };

export function createI18n(initial = 'en') {
  const state = { lang: initial };
  return {
    get lang() { return state.lang; },
    setLang(code) { if (TABLES[code]) state.lang = code; },
    t(key, vars = {}) {
      let s = (TABLES[state.lang] ?? EN)[key] ?? key;
      for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
      return s;
    },
  };
}
```

- [ ] **Step 6: Run parity test, verify pass**

Run: `node --test tests/parity.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit and push**

```bash
git add salvoconducto/src/strings/ salvoconducto/src/i18n.mjs salvoconducto/tests/parity.test.mjs
git commit -m "feat(salvoconducto): bilingual EN/ES strings with parity test"
git push origin main
```

---

### Task 7: UI — render the five beats

**Files:**
- Create: `salvoconducto/src/styles.css`
- Create: `salvoconducto/src/ui.mjs`
- Create: `salvoconducto/src/app.mjs`
- Create: `salvoconducto/index.html`
- Create: `salvoconducto/tools/check-dom.mjs`

**Interfaces:**
- Consumes: `createWorld`, `runScenario`, `BENEFIT_REQUEST`, `HELPER_OVERASK`, `exposure` from `scenario.mjs`; `createI18n` from `i18n.mjs`.
- `app.mjs` mounts the UI into `#app`. `ui.mjs` exports `mount(root, { world, i18n })` which renders the Passport grid, the request card with a minimization meter, a live receipt feed, and the revoke → prove → honesty sequence, wiring buttons to the real broker/auth so all crypto runs in the browser.
- The UI drives the beats *interactively* (Grant, then agents read, then over-ask, then Revoke, then Prove), not by calling `runScenario` — the scripted `runScenario` is the test oracle; the UI performs the same operations step by step so a judge clicks through them.

- [ ] **Step 1: Write `src/styles.css`**

```css
:root {
  --bg: #f6f7f9; --panel: #ffffff; --ink: #14181f; --muted: #5b6472;
  --line: #e2e6ec; --accent: #2f6df6; --ok: #1a7f4b; --deny: #c02b2b; --warn: #b7791f;
  --hi: #c02b2b; --med: #b7791f; --lo: #5b6472;
}
:root[data-theme='dark'], :root:not([data-theme='light']) {}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #0e1116; --panel: #161b22; --ink: #e6edf3; --muted: #9aa4b2;
    --line: #2a313c; --accent: #5b8cff; --ok: #3fb950; --deny: #f0716f; --warn: #e3b341;
    --hi: #f0716f; --med: #e3b341; --lo: #9aa4b2;
  }
}
:root[data-theme='dark'] {
  --bg: #0e1116; --panel: #161b22; --ink: #e6edf3; --muted: #9aa4b2;
  --line: #2a313c; --accent: #5b8cff; --ok: #3fb950; --deny: #f0716f; --warn: #e3b341;
  --hi: #f0716f; --med: #e3b341; --lo: #9aa4b2;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
#app { max-width: 1080px; margin: 0 auto; padding: 24px 20px 64px; }
header.top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 26px; margin: 0; letter-spacing: -0.02em; }
.tagline { color: var(--muted); margin: 2px 0 0; }
button { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); padding: 8px 12px; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.danger { background: var(--deny); border-color: var(--deny); color: #fff; }
button:disabled { opacity: 0.5; cursor: default; }
.grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.panel h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 0 0 12px; }
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 320px; overflow: auto; }
@media (max-width: 520px) { .fields { grid-template-columns: 1fr; } }
.field { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; font-size: 13px; }
.field .k { color: var(--muted); }
.field.granted { border-color: var(--accent); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.dot.high { background: var(--hi); } .dot.medium { background: var(--med); } .dot.low { background: var(--lo); }
.meter { height: 8px; border-radius: 5px; background: var(--line); overflow: hidden; margin: 8px 0; }
.meter > span { display: block; height: 100%; background: var(--ok); }
.reqfield { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line); }
.reqfield label { flex: 1; }
.feed { max-height: 320px; overflow: auto; font: 13px/1.5 ui-monospace, Menlo, Consolas, monospace; }
.receipt { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--line); margin-bottom: 6px; }
.receipt.allow { border-left: 3px solid var(--ok); }
.receipt.deny { border-left: 3px solid var(--deny); }
.receipt .seq { color: var(--muted); }
.badge { font-size: 12px; padding: 1px 6px; border-radius: 20px; border: 1px solid var(--line); }
.badge.allow { color: var(--ok); } .badge.deny { color: var(--deny); }
.prove { margin-top: 12px; padding: 12px; border: 1px dashed var(--line); border-radius: 10px; }
.prove.dead { border-color: var(--deny); }
.honesty { margin-top: 12px; }
.controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.chain { font-size: 12px; color: var(--muted); margin-top: 8px; }
```

- [ ] **Step 2: Write `src/ui.mjs`**

```javascript
import { BENEFIT_REQUEST, HELPER_OVERASK, exposure } from './scenario.mjs';

function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
}

export function mount(root, { world, i18n }) {
  const t = (k, v) => i18n.t(k, v);
  const selected = new Set(BENEFIT_REQUEST.fields);
  let token = null;

  root.replaceChildren();

  const header = el('header', { class: 'top' }, [
    el('div', {}, [el('h1', { text: t('title'), id: 'title' }), el('p', { class: 'tagline', text: t('tagline') })]),
    el('div', {}, [
      el('button', { id: 'lang', text: t('langToggle'), onclick: () => { i18n.setLang(i18n.lang === 'en' ? 'es' : 'en'); mount(root, { world, i18n }); } }),
    ]),
  ]);

  const passportPanel = el('section', { class: 'panel', id: 'passport' }, [el('h2', { text: t('passportHeading') })]);
  const fields = el('div', { class: 'fields' });
  for (const f of world.passport.list()) {
    fields.append(el('div', { class: 'field', id: 'pf-' + f.key }, [
      el('div', {}, [el('span', { class: 'dot ' + f.sensitivity }), el('span', { text: f.label })]),
      el('div', { class: 'k', text: f.key }),
    ]));
  }
  passportPanel.append(fields);

  const reqPanel = el('section', { class: 'panel', id: 'request' }, [el('h2', { text: t('requestHeading') })]);
  reqPanel.append(el('p', {}, [el('strong', { text: BENEFIT_REQUEST.agent }), el('span', { text: ' — ' + BENEFIT_REQUEST.task })]));
  const meter = el('div', { class: 'meter' }, [el('span', { id: 'meterbar' })]);
  const meterLabel = el('p', { id: 'meterlabel' });
  const reqList = el('div', { id: 'reqlist' });

  function drawMeter() {
    const total = world.passport.count();
    const n = selected.size;
    root.querySelector('#meterbar').style.width = Math.round((n / total) * 100) + '%';
    root.querySelector('#meterlabel').textContent = t('minimization', { n, total });
  }
  for (const f of BENEFIT_REQUEST.fields) {
    const cb = el('input', { type: 'checkbox', id: 'cb-' + f });
    cb.checked = true;
    cb.addEventListener('change', () => { cb.checked ? selected.add(f) : selected.delete(f); drawMeter(); });
    const meta = world.passport.meta(f);
    reqList.append(el('div', { class: 'reqfield' }, [
      cb, el('label', { for: 'cb-' + f, text: meta.label }),
      el('span', { class: 'k', text: BENEFIT_REQUEST.purpose }),
    ]));
  }
  const grantBtn = el('button', { class: 'primary', id: 'grant', text: t('grant') });
  const denyBtn = el('button', { id: 'deny', text: t('deny') });
  reqPanel.append(reqList, meter, meterLabel, el('div', { class: 'controls' }, [grantBtn, denyBtn]));

  const feedPanel = el('section', { class: 'panel', id: 'receipts' }, [el('h2', { text: t('receiptsHeading') })]);
  const feed = el('div', { class: 'feed', id: 'feed' });
  const chain = el('div', { class: 'chain', id: 'chain' });
  const revokeBtn = el('button', { class: 'danger', id: 'revoke', text: t('revoke'), disabled: 'true' });
  const proveBox = el('div', { class: 'prove', id: 'prove' });
  const honesty = el('div', { class: 'honesty', id: 'honesty' });
  feedPanel.append(feed, chain, el('div', { class: 'controls' }, [revokeBtn]), proveBox, honesty);

  async function refreshFeed() {
    feed.replaceChildren();
    for (const e of world.ledger.all()) {
      const cls = e.decision === 'ALLOW' ? 'allow' : 'deny';
      feed.append(el('div', { class: 'receipt ' + cls }, [
        el('span', { class: 'seq', text: '#' + e.seq + ' ' }),
        el('span', { text: e.actor + ' ' + e.action + ' ' + e.field + ' ' }),
        el('span', { class: 'badge ' + cls, text: e.decision + (e.reason ? ' (' + e.reason + ')' : '') }),
        e.decision === 'ALLOW' ? el('div', { text: '→ ' + e.value }) : el('div', { text: e.reason === 'out-of-scope' ? t('overAskFlag') : '' }),
      ]));
    }
    const v = await world.ledger.verifyChain();
    chain.textContent = v.ok ? t('chainOk') : t('chainBroken');
    feed.scrollTop = feed.scrollHeight;
  }

  grantBtn.addEventListener('click', async () => {
    token = await world.mintGrant([...selected], BENEFIT_REQUEST.ttlMs);
    root.querySelector('#pf-' + [...selected][0]);
    for (const f of selected) root.querySelector('#pf-' + f)?.classList.add('granted');
    grantBtn.disabled = true; denyBtn.disabled = true; revokeBtn.disabled = false;
    for (const f of BENEFIT_REQUEST.fields) {
      if (selected.has(f)) await world.broker.read(token, f, BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
    }
    await world.broker.read(token, HELPER_OVERASK.field, HELPER_OVERASK.purpose, HELPER_OVERASK.agent);
    await refreshFeed();
  });

  revokeBtn.addEventListener('click', async () => {
    world.auth.revoke(token.id);
    revokeBtn.disabled = true;
    const probe = await world.broker.read(token, 'diagnosis_code', BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
    proveBox.classList.add('dead');
    proveBox.replaceChildren(
      el('strong', { text: t('proveHeading') }),
      el('div', { text: t('proveRun') }),
      el('div', { class: 'badge deny', text: probe.ok ? '??' : t('proveDenied') }),
    );
    const ex = exposure(world.ledger, world.passport);
    honesty.replaceChildren(
      el('strong', { text: t('honestyHeading') }),
      ...ex.sensitiveFieldsRead.map((f) => el('div', { text: t('honestyLine', { field: world.passport.meta(f).label }) })),
      el('div', { text: t('exposureLine', { count: ex.count, minutes: 1 }) }),
    );
    await refreshFeed();
  });

  denyBtn.addEventListener('click', () => { grantBtn.disabled = true; denyBtn.disabled = true; });

  root.append(header, el('div', { class: 'grid' }, [el('div', {}, [passportPanel]), el('div', {}, [reqPanel, feedPanel])]));
  drawMeter();
}
```

- [ ] **Step 3: Write `src/app.mjs`**

```javascript
import { createWorld } from './scenario.mjs';
import { createI18n } from './i18n.mjs';
import { mount } from './ui.mjs';

const world = await createWorld();
const i18n = createI18n('en');
mount(document.getElementById('app'), { world, i18n });
```

- [ ] **Step 4: Write `salvoconducto/index.html` (dev shell)**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Salvoconducto</title>
  <link rel="stylesheet" href="src/styles.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="src/app.mjs"></script>
</body>
</html>
```

- [ ] **Step 5: Write `tools/check-dom.mjs` (id contract check, no browser)**

```javascript
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/ui.mjs', import.meta.url), 'utf8');
const querySelectorIds = [...ui.matchAll(/querySelector\('#([\w-]+)'\)/g)].map((m) => m[1]);
const createdIds = new Set([...ui.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]));
createdIds.add('app');

const dynamicPrefixes = ['pf-', 'cb-', 'meterbar', 'meterlabel'];
const missing = querySelectorIds.filter((id) => !createdIds.has(id) && !dynamicPrefixes.some((p) => id.startsWith(p)));
if (missing.length) {
  console.error('Missing ids referenced by querySelector:', missing);
  process.exit(1);
}
console.log('DOM id contract OK:', querySelectorIds.length, 'lookups checked');
```

- [ ] **Step 6: Syntax-check all browser modules**

Run: `node --check src/ui.mjs && node --check src/app.mjs && node tools/check-dom.mjs`
Expected: no syntax errors; prints `DOM id contract OK`.

- [ ] **Step 7: Serve and confirm assets return 200**

Run: `python -m http.server 8099 --directory salvoconducto & sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/index.html && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/src/app.mjs && kill %1`
Expected: `200` then `200`.

- [ ] **Step 8: Manual render check (human)**

Open `http://localhost:8099/` in a browser. Confirm: Passport grid renders 20 fields; minimization meter reads "3 of 20"; Grant streams three ALLOW receipts + one DENY (over-ask); Revoke shows the DENIED proof and the honesty panel; the language toggle flips EN/ES. (This step is performed by Felipe; agents stop here and report.)

- [ ] **Step 9: Commit and push**

```bash
git add salvoconducto/src/styles.css salvoconducto/src/ui.mjs salvoconducto/src/app.mjs salvoconducto/index.html salvoconducto/tools/check-dom.mjs
git commit -m "feat(salvoconducto): interactive UI for the five-beat flow"
git push origin main
```

---

### Task 8: Build a single self-contained Artifact file

**Files:**
- Create: `salvoconducto/tools/build.mjs`
- Create (generated): `salvoconducto/dist/artifact.html`

**Interfaces:**
- `build.mjs` reads the modules in dependency order, strips `import`/`export` keywords, concatenates them inside one IIFE, inlines `styles.css`, and writes body-only HTML (`<style>…</style><div id="app"></div><script>…</script>`) to `dist/artifact.html`. No external references. This is the file passed to the Artifact tool (which supplies `<!doctype>`, `<head>`, `<body>`).

- [ ] **Step 1: Write `tools/build.mjs`**

```javascript
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const ORDER = [
  'src/cryptoutil.mjs',
  'src/passport.mjs',
  'src/token.mjs',
  'src/introspect.mjs',
  'src/broker.mjs',
  'src/receipts.mjs',
  'src/scenario.mjs',
  'src/strings/en.mjs',
  'src/strings/es.mjs',
  'src/i18n.mjs',
  'src/ui.mjs',
  'src/app.mjs',
];

function strip(code) {
  return code
    .split('\n')
    .filter((l) => !/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(l))
    .map((l) => l.replace(/^\s*export\s+(const|function|class|async\s+function)\s/, '$1 ').replace(/^\s*export\s+\{[^}]*\};?\s*$/, ''))
    .join('\n');
}

const js = ORDER.map((p) => strip(read(p))).join('\n\n');
const css = read('src/styles.css');

const body = `<style>\n${css}\n</style>\n<div id="app"></div>\n<script>\n(async () => {\n${js}\n})();\n</script>\n`;

mkdirSync(new URL('dist/', ROOT), { recursive: true });
writeFileSync(new URL('dist/artifact.html', ROOT), body);

if (/\b(src=|href=|https?:\/\/)/.test(body.replace(/https?:\/\/[^\s'"]*w3\.org/g, ''))) {
  console.error('External reference detected in artifact');
  process.exit(1);
}
console.log('Built dist/artifact.html —', body.length, 'bytes');
```

- [ ] **Step 2: Run the build**

Run: `cd salvoconducto && node tools/build.mjs`
Expected: prints `Built dist/artifact.html — <N> bytes`, no external-reference error.

- [ ] **Step 3: Verify the built file is self-contained and syntactically valid**

Run: `node --check <(sed -n '/<script>/,/<\/script>/p' dist/artifact.html | sed '1d;$d') && grep -c "id=\"app\"" dist/artifact.html`
Expected: no syntax error; grep prints `1`. (If `node --check` on a process substitution is awkward on Windows Git Bash, instead run: `node -e "const s=require('fs').readFileSync('dist/artifact.html','utf8'); const m=s.match(/<script>([\s\S]*)<\/script>/)[1]; new Function(m); console.log('script parses')"`.)

- [ ] **Step 4: Serve the built artifact and confirm 200**

Run: `python -m http.server 8098 --directory salvoconducto/dist & sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8098/artifact.html && kill %1`
Expected: `200`.

- [ ] **Step 5: Manual render check of the built file (human)**

Felipe opens `dist/artifact.html` in a browser (or the served URL) and confirms it behaves identically to the dev shell. Agents stop and report.

- [ ] **Step 6: Commit and push**

```bash
git add salvoconducto/tools/build.mjs salvoconducto/dist/artifact.html
git commit -m "build(salvoconducto): inline self-contained artifact bundle"
git push origin main
```

---

### Task 9: Publish the Artifact (deploy action)

**Files:** none (uses the Artifact tool).

- [ ] **Step 1: Load the artifact-design skill** to calibrate design investment, then review `dist/artifact.html` against it and tighten spacing/type where cheap.
- [ ] **Step 2: Publish** `salvoconducto/dist/artifact.html` via the Artifact tool with a `<title>Salvoconducto</title>`, a one-sentence description ("A revoke button for AI agents you can prove — scoped Passport access, live receipts, provable revocation."), and favicon `🛂`. The Artifact starts private; Felipe decides when to share the link with judges.
- [ ] **Step 3: Report the private URL to Felipe.** Do not submit anywhere — submission is Felipe's alone.

---

## Self-Review

**Spec coverage:** §4 five beats → Tasks 5 & 7. §5.1 components → Tasks 1-7 (passport, token, introspect+broker, receipts, agents/scenario, ui, strings). §5 Web Crypto primitives → Tasks 2-4. §6 form-field mapping → written submission (separate Day-2 deliverable, not code). §7 deliverables: demo → Tasks 1-9; written submission, threat model, video → Day-2/Day-3 (authored, tracked in SPEC plan §10, not this code plan). §11 out-of-scope respected (no backend, no LLM, no multi-hop chain).

**Placeholder scan:** every code step contains complete, runnable code; no TBD/TODO.

**Type consistency:** `mint/attenuate/verify` signatures match across Tasks 2-3-5; `createBroker({passport, auth, ledger})` matches Tasks 3-5; `ledger.append/all/verifyChain/export` match Tasks 4-5-7; `createI18n().t/lang/setLang` match Tasks 6-7; `exposure(ledger, passport)` two-arg form is consistent in Tasks 5 and 7.

**Note:** The written submission, one-page threat model, and video script are authored deliverables (Day 2-3 of SPEC §10), not part of this code plan; they get their own short drafting pass after the demo builds and Felipe has clicked through it.
