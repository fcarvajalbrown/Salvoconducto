## Inspiration

A while back I built MuniGPT, an assistant for Chilean municipalities, on one rule: no institutional data ever leaves the building. Not to a cloud, not to a vendor, not anywhere. People trusted it because their data stayed on their side of the table.

Then AI agents arrived, and we started handing them the run of our lives. Book this, file that, answer for me. The AI Passport is the first serious attempt to put a permission system in front of that. An app asks for exact fields, for a stated purpose, and you get receipts.

But once an agent acts as you, two things are still missing. When you revoke, can you prove the access died, or are you only trusting a button? And the data the agent already read, what about that? You cannot un-read it.

In Chile we had a word for the pass that let you move under curfew: a salvoconducto. Personal, time-limited, issued for one declared reason. I wanted that, turned around and handed to the citizen, for the machines that now act on our behalf.

## What it does

Salvoconducto is a control layer for agent delegation, built on the AI Passport. It does not replace the Passport's permissions. It consumes them and adds the part an agent needs.

The demo walks one case: an agent files a disability benefit claim for you.

- It asks for exactly three fields, each with a purpose and a thirty-minute expiry, and a meter shows how little of your Passport that is.
- You grant by choosing from your own record. Every read then streams to a live log.
- A second agent over-asks for your full medical history. It is denied and logged, on the spot.
- You revoke. The tool fires a probe read in front of you, and it comes back denied. Not greyed out. Denied.
- An honesty panel names the one sensitive field the agent already saw, and tells you plainly that exposure was held to that.

Every agent, whoever built it, goes through the same grant, the same log, the same revoke. One place, not one per app.

## How we built it

One self-contained web page. No dependencies, no server, no build step you have to trust. The three parts that matter are real, using the browser's own Web Crypto:

- A capability token in the Macaroon style, an HMAC-SHA-256 chain of caveats that can only narrow. Ask for more in a caveat and it is ignored at verification.
- Revocation by introspection, the RFC 7662 model. The token's live status is checked on every read, so revoking bites on the next read instead of waiting for an expiry to run out.
- A hash-chained receipt log, where each entry commits to the previous one's SHA-256, so editing the past breaks the chain. The log keeps a salted hash of each value, never the value itself.

Twenty-eight tests cover the cryptography and the scenario, and the whole thing is a single file you can open and read.

## Challenges we ran into

The honest one first. I wanted a revoke button you could prove, and then I had to admit that proving revocation proves the wrong thing if the agent already read the field. So minimization became the headline and revocation the backstop. That is the truthful order, even if it is the less flashy one.

The second was in my own code. I kept writing the value into the receipt, until I saw that my audit log had quietly become a second copy of the data I claimed to minimize. Now it stores a salted hash.

The third is a boundary I decided to state up front rather than bury. The AI Passport is not generally available yet, so the Passport, the agents, and the authorization server are simulated in the browser. The cryptography is real. The integration is not, and I say so on the page.

## Accomplishments that we're proud of

The security is not a costume. The token, the revocation, and the ledger are genuine Web Crypto, and a technical judge can open the source and check.

The design tells the truth about its own limits. Most demos hide the awkward part; this one puts the already-read problem on screen and answers it with minimization instead of a magic claw-back.

Even the audit trail practices what it preaches: it proves what was read without keeping the reading.

And it is small. One file, offline, no dependencies, twenty-eight tests, readable in an afternoon.

## What we learned

That the field named this problem across 2026 and consumer tools still skip it. That the strong move is not a bigger revoke, it is a smaller grant. And that a proven primitive, the Macaroon from 2014, beats inventing cryptography for a weekend.

## What's next for Salvoconducto

Delegation chains, where an agent hires another and scope can only shrink down the line, with revocation cascading to every hop. Real integration once the Passport opens its doors. And a version that a person filing an actual claim, on an actual hard day, could sit down and use.
