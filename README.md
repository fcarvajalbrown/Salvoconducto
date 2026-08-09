# Salvoconducto

A citizen-side control layer for AI-agent delegation, built on the AI Passport.

Give an agent the fewest fields it needs, for one purpose and a set time, with an honest account
of what it already saw. A *salvoconducto* was the Chilean curfew pass: personal, time-limited, and
issued for one declared reason. This is that pass, turned toward the citizen and handed to the
machines that now act on our behalf.

**Live demo:** https://fcarvajalbrown.github.io/Salvoconducto/

Built for the AI Passport Ideathon (Egoist Machines @ Cambridge), Agents track.

## The idea

The AI Passport already lets an app request scoped fields, for a purpose, and shows receipts. The
missing half, once an agent acts *as you*, is twofold: revocation that you can verify rather than
trust, and honesty about the fact that data an agent has already read cannot be un-read. So the
design leans on two things the industry named through 2026 but consumer tools still skip:

1. **Minimize what is ever exposed.** Per field, per purpose, time-boxed. Because the past cannot
   be clawed back, the smaller the exposure, the smaller the irreducible loss.
2. **Verify revocation at the enforcement point.** The token status is checked on every read, so
   the next read after you revoke is denied, and the tool proves it with a live probe.

## What it does

Scenario: an agent files a disability benefit claim for you.

1. The agent requests exactly 3 of your Passport fields, each with a purpose and a 30-minute
   expiry. A minimization meter shows how little it asked for.
2. On grant, a scoped capability token is minted and every read streams to a receipt log.
3. A second agent over-asks for your full medical history. The read is denied and logged.
4. You revoke. The tool fires a probe read that returns denied, in front of you.
5. An honesty panel names the one sensitive field the agent already saw, and that exposure was
   minimized.

## How it works

Three primitives, implemented for real with the browser Web Crypto API, no dependencies:

- **Capability token** — a Macaroon-style credential (HMAC-SHA-256 chained caveats). Attenuation
  can only narrow scope; a caveat that names extra fields is ignored at verify time.
- **Introspection revocation** — opaque token whose live status is checked on every read (the RFC
  7662 model), so revocation takes effect on the next read rather than at some expiry.
- **Hash-chained receipts** — each entry commits to the previous entry's SHA-256, so any edit to a
  past entry breaks the chain. The ledger stores a salted hash of each value read, not the value.

## Honest limitations

- The AI Passport is not yet generally available, so the Passport, the agents, and the
  authorization server are simulated in the browser. The cryptography is real; the integration is
  not.
- Revocation governs future reads. It does not un-read what an agent already read. Minimization is
  the defense for the past; revocation is the backstop for the future.
- Single hop only. Sub-agent delegation chains are a natural next step, not built here.

## Run it

No dependencies. Node 18+.

```
node --test          # 28 tests across the three primitives and the scenario
node tools/build.mjs # regenerate the single-file build
```

Open `index.html` in a browser, or serve the folder with any static host.

## Standards it draws on

RFC 7662 (token introspection) is the one normative standard implemented. The capability token
reuses the Macaroon (2014) and Biscuit (2021) model. Kantara consent receipts and GDPR purpose
limitation inform the receipt and purpose-binding design. The NIST NCCoE AI-agent concept paper
and the IETF attenuating-tokens draft are early signals of where the field is heading, not adopted
standards.

## License

MIT. See [LICENSE](LICENSE).
