# Salvoconducto — Threat Model

Scope: an AI agent is granted delegated access to a person's AI Passport to perform a declared
task (here, filing a disability benefit claim). The asset is the person's structured personal
data; the adversaries are an over-reaching or compromised agent, and revocation that does not
actually take effect. Salvoconducto's job is to make the grant minimal, purpose-bound, and
provably revocable.

The design follows the four minimum requirements named in NIST NCCoE's AI Agent Standards
Initiative concept paper (Feb 2026): **identification, authorization, access delegation, and
logging.** That paper is an early signal of where the field is heading, not an adopted practice
guide, and it is cited here as direction, not as a standard we conform to.

The capability token is a deliberate reuse of a proven primitive — the Macaroon (Birgisson et al.,
2014) and Biscuit (2021) model of HMAC-chained, attenuation-only caveats — rather than new
cryptography. The one normative standard the design actually implements is opaque-token
introspection (RFC 7662).

| Requirement | Where it lives |
|---|---|
| Identification | Each grant names the agent and binds the token to it (`token.agent`). |
| Authorization | Per-read introspection check: signature, status, expiry, purpose, scope. |
| Access delegation | Capability token with signed, append-only caveats that can only narrow. |
| Logging | Hash-chained, tamper-evident receipt ledger over every read and decision. |

## Threats and mitigations

### T1 — Over-ask
An agent requests more fields than the task needs.
- **Mitigation.** Access is granted per field, not per app. The minimization meter makes the
  ask legible ("3 of 20"), and the person can drop fields before granting. Least privilege by
  construction, in line with the 2026 least-privilege-for-agents guidance from Microsoft, Okta,
  and Zscaler.
- **Residual.** The person can still grant more than necessary; the tool informs, it does not
  overrule consent.

### T2 — Prompt-injected over-reach
A compromised agent, mid-task, attempts a read outside the declared scope (the demo's
`HelperBot` reaching for `full_medical_history`).
- **Mitigation.** The caveat set is the ceiling, enforced on every read by the authorization
  server, not a hint the agent is trusted to honor. The out-of-scope read is denied and written
  to the ledger. Purpose is also checked, so a valid field used for the wrong purpose is denied.
- **Standard.** Purpose-based access control as described by the Kantara Consent Receipt work:
  the enforcement point checks the requested purpose against the granted purpose at request time.

### T3 — Revocation that does not take effect ("revocation theater")
The person revokes, but cached tokens keep working — the failure the industry calls an "illusion
of control."
- **Mitigation.** Tokens are opaque and introspected on every read (the RFC 7662 model), so the
  authorization server holds the live status. Revoking flips one record and the very next
  introspection fails. Salvoconducto proves it: after revoke, it fires a probe read in front of
  the user and shows the `DENIED — token revoked` result. Revocation is tested, not assumed.
- **Why not JWT.** A stateless JWT stays valid until its expiry claim regardless of "revoke,"
  which is exactly the gap this design refuses.

### T4 — Already-read residue
Data the agent read before revocation has entered its context and cannot be un-seen.
- **Mitigation.** This is not fully solvable, and the design says so rather than pretending. The
  defense is to bound the blast radius up front: minimize fields, bind purpose, and time-box the
  grant, so the unrecoverable set is as small as possible. The honesty panel names exactly which
  sensitive value was exposed and for how long. This mirrors 2026 agent-memory-governance
  guidance (New America OTI; ephemeral, no-retention reads; crypto-shred).
- **Residual.** One sensitive field was exposed for the duration of the task. That is the
  irreducible cost of delegation, stated honestly.

### T5 — Tampering with the record
An attacker (or the agent) edits the audit log to hide a read.
- **Mitigation.** The ledger is hash-chained: each entry commits to the previous entry's hash,
  so altering any past entry breaks every hash after it. `verifyChain` detects the break and
  names the index. The demo surfaces this as a live `✓ chain intact` indicator.

## Limitations (stated, not hidden)

- **Prototype.** The AI Passport is not yet generally available, so the Passport, the agents, and
  the authorization server are simulated locally. The cryptography is real (Web Crypto:
  HMAC-SHA-256 caveat chains, SHA-256 receipt chain); the integration is not.
- **Single hop.** Delegation chains (an agent hiring sub-agents) are out of scope for this build.
  The capability token already supports attenuation, so scope narrowing across hops is the
  natural next step, but the multi-hop revocation cascade is not implemented here.
- **Consent is sovereign.** Salvoconducto informs and enforces; it does not override a person who
  chooses to grant broadly. Data minimization is offered, not imposed.

## References

- RFC 7662, OAuth 2.0 Token Introspection — opaque-token status checked per request. The one
  normative standard this design implements.
- Macaroons (Birgisson et al., NDSS 2014) and Biscuit (2021) — the attenuation-only, HMAC-chained
  capability model the token reuses.
- NIST NCCoE, AI Agent Standards Initiative (Feb 2026) — concept paper, early signal:
  identification, authorization, delegation, logging.
- IETF, draft-niyikiza-oauth-attenuating-agent-tokens — individual Internet-Draft, early signal,
  not an adopted standard.
- Kantara Initiative, Consent Receipt Specification — purpose-based access control and receipts.
- Microsoft, Okta, Zscaler (2026) — least privilege for AI agents.
- New America OTI; MCP audit-logging practice — agent memory governance, ephemeral reads,
  hash-chained logs, crypto-shred.
