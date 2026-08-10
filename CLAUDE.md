# Salvoconducto

A citizen-side control layer for AI-agent delegation, built on the AI Passport. Submission for the
AI Passport Ideathon (Egoist Machines @ Cambridge), Agents track. Deadline **2026-08-12, 23:45 BST**.

## Hard rules

**NEVER SUGGEST POLISH OF PRESENTATION (set 2026-08-10).** Do not propose UI polish, visual
tightening, copy tweaks, spacing, storyboards, or anything whose deliverable is how the work
*looks* rather than what it *does*. When asked what to improve, every option offered must be a
betterment of the program itself: what it enforces, what it proves, what it models correctly, what
it tests. The single carve-out is a website, possibly hosted on Hostinger, when Felipe asks for one
— and even then it ranks below the program. Set 2026-08-10 after a priority list offered "Demo
polish: make the proof clickable" and "Video script + storyboard" as two of four options.

**Ask before restructuring the Passport data model or the scenario.** Both encode claims about a
product (the AI Passport) whose real shape is only partly documented. Never invent categories,
field names, or counts — verify against ego.ist/developer or ask.

## Operating constraints

- **Zero third-party dependencies.** No `npm`/`pnpm add`, no bundler, no framework. Node built-ins
  and Web Crypto (`globalThis.crypto.subtle`) only. Node 18+.
- **`node --test` must stay green.** 28 tests across the primitives and the scenario. Run it before
  any commit.
- **`node tools/build.mjs` is the only way `index.html` and `dist/artifact.html` change.** Both are
  generated from `src/`. `index.html` is tracked and is what GitHub Pages serves; `dist/` is
  gitignored and exists only for the Artifact publish path. Never hand-edit either. Regenerate and
  commit `index.html` in the same commit as the `src/` change, or the published demo silently
  drifts from the source.
- **EN/ES string parity is enforced.** Every user-facing string lives in `src/strings/en.mjs` and
  `src/strings/es.mjs`; `tests/parity.test.mjs` fails on a missing or empty key. Adding a string to
  one file without the other breaks the suite.
- **`tools/check-dom.mjs`** verifies every `querySelector('#id')` in `src/ui.mjs` matches an id the
  same file creates. Run it after UI changes; there is no browser in this environment.
- **No runtime network calls, no external references.** The build fails on them by design; the
  Artifact CSP would block them anyway.
- **Deterministic agents.** No live LLM calls. The scenario is scripted so the demo reproduces.

## Documents

`SPEC.md` is the design spec and is stable. `docs/plan.md` is the executed build plan.
`docs/threat-model.md` and `docs/red-team-2026-08-09.md` carry the adversarial findings — read the
red-team doc before defending any claim the project makes about itself.
