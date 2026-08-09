# Salvoconducto — Design Spec

A control plane for AI-agent delegation, built on the AI Passport. The honest version of
the "revoke" button: an agent gets a scoped, purpose-bound, time-limited pass to your data,
you watch every read live, and when you revoke, the tool *proves* access is dead instead of
asking you to trust it.

Submission for the AI Passport Ideathon (Egoist Machines @ Cambridge). Track: **Agents**.
Lane: **Build**. Deadline: **2026-08-12, 23:45 BST**.

---

## 1. Strategy (why this can win)

- **Fluency is now free.** Every entrant has an AI writing polished prose. The only edge that
  can't be copied is authored judgment and lived expertise. Author (Felipe Carvajal Brown)
  genuinely builds this class of system: an auth library with token and hashing primitives
  (`Auth4Free`), a PII-masking engine (`MaskOps`) — data minimization in production — a
  secret-scanning + security-header auditing dashboard (`SentinelNode`), a Chilean state
  cybersecurity compliance scanner aligned to Ley 21.663 / ANCI / CSIRT Chile (`MuniGPT`), and
  agentic multi-agent workflow tooling (`Agentic-CS-Paper-Makers`, `book-agent`). Salvoconducto
  is an extension of real work, not a costume.
- **We build on the pillar most entrants fake.** The judging pillars are data minimization,
  user control over access/revocation, and a crisp account of exactly how the Passport is used.
  The spine is *provable, instant revocation + exposure minimization* — the hard part almost
  everyone hand-waves.
- **Optimize for the overall prize** (an interview with a YC-backed team), i.e. the single most
  technically credible submission, not narrow track-gaming.

## 2. Thesis

The AI Passport promises you can revoke an app's access "app-by-app, topic-by-topic." But in
practice **revocation is theater** and **you can't un-see what an agent already read**. So the
Passport's revoke button is only real if two things hold:

1. **Provable revocation** — access is cut *and verified dead* at the moment you pull it, not
   left to expire.
2. **Exposure minimization** — because the past is unrecoverable, the only defense against
   "already-read" is to minimize what was ever exposed, for how long, for what stated purpose.

Salvoconducto implements both, for real, in the browser.

### The civic frame (the un-copyable story)

A *salvoconducto* is the Chilean curfew pass: **personal, non-transferable, time-limited, and
issued for one declared purpose** (e.g. medical, 12h). That is precisely a capability token.
The framing device — "we took the state's pass-to-move-under-curfew and turned it into a
citizen-held pass for the machines that now act on our behalf" — is a story no other entrant
can tell. It is authentic to the author's civic-tech record (Chilean state cybersecurity
compliance tooling under Ley 21.663 / ANCI, `MuniGPT`; public-interest scanners, `RadarCL`).

## 3. Target user & scenario

**User:** high-stakes delegators — people letting an agent handle genuinely sensitive
procedures (health, legal, government paperwork), exactly where the research shows "memory-free
modes" are emerging and where over-sharing is most dangerous.

**Anchor scenario:** an agent files your **disability benefit claim** at a government portal.
It needs exactly three of your Passport fields — `national_id`, `monthly_income`,
`diagnosis_code` — each for a declared purpose and a short expiry. A second "helper" agent
over-asks for your `full_medical_history`. You grant the minimum, watch the work, revoke, and
prove the diagnosis field is dead.

## 4. The demo (five beats)

1. **The ask.** `BenefitBot` declares its task and requests 3 of your 24 Passport fields, each
   with `{purpose, ttl}`. A **minimization meter** shows "3 of 24." You can drop a field, grant,
   or deny.
2. **Live receipts.** On grant, a scoped, time-boxed **capability token** is minted (visible,
   with its caveats). A receipt feed streams every read (with the value returned) and every
   action, each purpose-checked in real time.
3. **Over-ask, caught live.** `HelperBot` tries to read `full_medical_history` "to help." Not in
   declared scope → **blocked, logged, flagged red.** Misuse detection working, not described.
4. **Revoke — and prove it.** You hit REVOKE. The tool then *runs the test in front of the
   judge*: it fires a probe read → **DENIED (token revoked)**. Access didn't grey out, it died,
   and the proof is shown. This is the industry's own rule — "revocation must be tested, not
   assumed" — made visible.
5. **Honesty panel.** Show what `BenefitBot` already read *before* revoke, marked plainly:
   "`diagnosis_code` entered the agent's context at 12:01 and cannot be un-seen. Exposure was
   minimized: 1 sensitive field, 4 minutes." Revoke stops the future; minimization bounds the
   past.

## 5. Architecture

A single self-contained web app (no build-time or runtime network dependency), publishable as a
private Artifact link so judges click one URL. Bilingual EN/ES. Theme-aware. Responsive.

The three security primitives are **implemented for real using the browser Web Crypto API**
(`crypto.subtle`), with zero third-party dependencies — a judge can open devtools and confirm
they are genuine.

### 5.1 Components (modules, each independently testable)

- `passport.js` — the simulated AI Passport: a structured record of ~24 fields grouped by topic
  (Identity, Income, Health, Contacts, Payment, …), each with a sensitivity tag and value. Pure
  data + accessors. No UI.
- `token.js` — **capability token** (Macaroon-style). Mint a root token bound to
  `{agent, fields[], purpose, ttl, nonce}`; attenuate by appending signed caveats that can only
  *narrow* scope. Signing/verification via HMAC-SHA-256 chained construction over Web Crypto.
  Exposes `mint`, `attenuate`, `verify(token, request)`.
- `introspect.js` — the authorization server's revocation state. Holds an opaque token registry
  (`active | revoked`). `read(token, field, purpose)` performs an **introspection check every
  call**: verify signature, check registry status, check field ∈ scope, check purpose match,
  check not expired. `revoke(tokenId)` flips the registry entry. This is what makes revocation
  provable: the next introspection fails immediately.
- `receipts.js` — **hash-chained, tamper-evident audit log**. Each entry
  `{seq, ts, actor, action, field?, purpose?, decision, prevHash}` with
  `hash = SHA-256(prevHash ‖ entry)`. Exposes `append`, `verifyChain`, `export` (Kantara-style
  consent-receipt JSON).
- `agents.js` — scripted agents (`BenefitBot`, `HelperBot`) that drive the scenario by issuing
  reads/actions through `introspect.read`. Deterministic, so the demo is reproducible.
- `ui.js` — renders the Passport, the request card + minimization meter, the live receipt feed,
  the revoke control, the probe-test result, and the honesty panel. Reads i18n strings.
- `strings/en.js`, `strings/es.js` — all copy, kept in parity (parity checker per eliza-parry).

### 5.2 Data flow

```
agent.request(fields, purpose, ttl)
   → UI shows request card + minimization meter
   → user grants (optionally editing fields)
   → token.mint(...) → introspect.register(active)
   → agent.read(token, field, purpose)
        → introspect.check: sig ✓ / status active ✓ / field∈scope ✓ / purpose✓ / not expired ✓
        → receipts.append(read, ALLOW, value)   [or DENY on over-ask]
   → user.revoke(tokenId) → introspect.status = revoked
   → PROBE: agent.read(...) → introspect.check → status revoked → DENY
        → receipts.append(probe, DENY)   ← the visible proof
   → honesty panel reads receipts for reads that happened before revoke
```

### 5.3 Why the Passport, across tools (the cross-tool pillar)

`BenefitBot` and `HelperBot` are different vendors, yet both are governed by one control plane
because both speak the Passport's request/grant/introspect protocol. One place to grant, watch,
and revoke across every agent — the cross-tool utility judges ask for. Mirrors real standards:
capability tokens (Macaroons/Biscuit; IETF `draft-niyikiza-oauth-attenuating-agent-tokens`),
opaque-token introspection (RFC 7662), Kantara consent receipts, UMA 2.0.

## 6. Mapping to the submission form

| Form field | Answer source |
|---|---|
| Problem | All-or-nothing delegation; revocation is theater; "already-read" is unrecoverable. |
| Affected users | High-stakes delegators (health/legal/government procedures). |
| How the Passport is utilized | Per-field, purpose-bound, time-boxed capability grants; live receipts; introspection revocation. |
| Context / permissions / access control | Capability token with signed caveats; introspection check on every read; purpose match required. |
| What can be revoked / changed | Any grant, instantly and provably; field-, topic-, and agent-granular; edit-down before granting. |
| Risks / misuse | Over-ask, prompt-injected over-reach, already-read residue, cross-service inference leakage — each mitigated and named in the threat model. |

## 7. Deliverables

1. **The live demo** — self-contained web app, published as a private Artifact (one click for
   judges). Centerpiece.
2. **The written submission** — every form field, in the author's voice, run through the
   humanizer so it does not read as machine output.
3. **A one-page threat model** — the misuse taxonomy with mitigations, mapped to the confirmed
   references (NIST NCCoE AI Agent Standards; Microsoft/Okta least-privilege; Kantara; IETF
   attenuating-tokens draft; RFC 7662). Few entrants will bring this depth.
4. **A ~2-minute demo video** — script/storyboard authored here; **the author records and
   narrates** (human-only, and it makes the entry unmistakably his).

## 8. Reuse

- **Scaffolding:** the `eliza-parry` web pattern — self-contained bundle, bilingual string files,
  vanilla JS, `tools/check_parity.js` discipline.
- **Authenticity anchors** (author's own non-fork repos, referenced not imported): `Auth4Free`
  (token/hashing primitives), `MaskOps` (PII masking = minimization), `SentinelNode` (secret
  scanning + security-header audit), `MuniGPT` (Ley 21.663 / ANCI state-security scanner),
  `Agentic-CS-Paper-Makers` and `book-agent` (agentic workflows), and the wider Chilean
  civic-tech portfolio (`RadarCL`, `port-scanner`).

## 9. Risks / misuse taxonomy (for the threat model)

- **Over-ask** — agent requests more than the task needs. Mitigation: per-field grant +
  minimization meter + scope enforcement on every read.
- **Prompt-injected over-reach** — a compromised agent tries a read outside declared scope.
  Mitigation: introspection denies + logs; the caveat set is the ceiling, not a suggestion.
- **Already-read residue** — data the agent saw before revoke cannot be un-seen. Mitigation:
  minimize exposure (fields, duration, purpose); honesty panel states what is unrecoverable;
  ephemeral/no-retention read posture; crypto-shred framing.
- **Cross-service inference leakage** — an agent infers a sensitive attribute (health from a
  calendar entry) and forwards it. Mitigation: purpose binding + field-level scope; out-of-scope
  reads never occur.
- **Revocation theater** — the failure mode we exist to fix. Mitigation: opaque-token
  introspection checked per read; the probe test proves death.

## 10. Plan (3 days; deadline 2026-08-12 23:45 BST)

- **Day 1** — Build the demo: `passport`, `token`, `introspect`, `receipts`, `agents`, `ui`,
  strings; wire the five beats; ship a private Artifact link. Unit tests for the three
  primitives (attenuation only narrows; revoked token fails introspection; receipt chain
  verifies and detects tampering).
- **Day 2** — Polish UI and the "wow" beats; write the submission copy + threat model + run the
  humanizer; storyboard the video.
- **Day 3** — Author records the video; final review; **author submits**. Salvoconducto never
  submits or contacts anyone on the author's behalf.

## 11. Out of scope (YAGNI)

- No real Egoist API integration (the Passport is not yet generally available; a prototype is
  expected and correct).
- No backend, accounts, persistence, or network calls — everything runs client-side and offline.
- No real delegation-chain (sub-agents hiring sub-agents); attenuation is implemented and shown,
  but the multi-hop chain is out of scope for the 3-day build. Noted as a natural next step.
- No live LLM calls; agents are scripted and deterministic so the demo is reproducible.

## 12. References (confirmed 2026-08-09)

- Revocation as "illusion of control"; test-not-assume — Curity, NHI Management Group.
- Already-read / agent memory governance; memory-free modes — New America OTI, CIO Influence.
- Least-privilege for agents; NIST NCCoE AI Agent Standards Initiative — Microsoft, Okta.
- Capability tokens / attenuation — IETF draft-niyikiza-oauth-attenuating-agent-tokens; Okta.
- Opaque token vs JWT, introspection RFC 7662 — guptadeepak, Bastionary.
- Consent receipts / purpose-based access control — Kantara Consent Receipt Specification.
- Ephemeral reads, hash-chained audit log, crypto-shred — Tetrate (MCP audit logging).
