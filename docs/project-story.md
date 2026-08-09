## Inspiration

I built MuniGPT for Chilean town halls on a single rule: no institutional data ever leaves the building. Not to a cloud, not to a vendor, not to me. The people who used it trusted it for one reason, that their data stayed on their side of the counter.

Then the agents arrived, and we began handing them the run of our lives, book this, file that, answer for me. The AI Passport is the first serious attempt to put a real permission system in front of that. An app asks for exact fields, for a stated purpose, and you get receipts. It is a real step. It is not the whole step.

Because once an agent acts as you, two questions stay open. When you revoke, can you prove the access died, or are you only trusting a button? And the field it already read, what about that? You cannot un-read it.

We have a word in Chile for the pass that let you cross the city under curfew: a salvoconducto. Personal, time-limited, issued for one declared reason. I wanted that word turned around, taken from the State and handed to the citizen, for the machines that now move in our name.

## What it does

Salvoconducto is a control layer for agent delegation, built on the AI Passport. It does not replace the Passport's permissions. It leans on them and adds the part an agent makes urgent.

The demo walks one case: an agent files a disability benefit claim for you.

- It asks for exactly three fields, each with a purpose and a thirty-minute expiry, and a meter shows how little of your Passport that is.
- You grant by choosing from your own record, never more than was asked. Every read then streams to a live log.
- A second agent reaches for your full medical history. It is denied and written down, in the same breath.
- You revoke. The tool fires a probe read in front of you, and it comes back denied. Not greyed out. Denied.
- An honesty panel names the one sensitive field the agent already saw, and tells you straight that exposure stopped there.

Every agent, whoever wrote it, passes through the same grant, the same log, the same revoke. One counter, not one per app.

## How we built it

One self-contained web page. No dependencies, no server, no build step you are asked to trust. The three parts that carry the argument are real, built on the browser's own Web Crypto.

A capability token in the Macaroon style, an HMAC-SHA-256 chain of caveats that can only narrow; ask for more inside a caveat and it is dropped at verification. Revocation by introspection, the RFC 7662 model, where the token's live status is checked on every read, so revoking bites on the next read instead of waiting out an expiry. And a hash-chained receipt log, each entry committing to the previous one's SHA-256, so a rewrite of the past snaps the chain. The log keeps a salted hash of every value, never the value.

Twenty-eight tests hold the cryptography and the scenario in place. The whole thing is one file you can open and read.

## Challenges we ran into

The honest one first. I wanted a revoke button you could prove, and then I had to admit that proving revocation proves the wrong thing once the agent has already read the field. So minimization became the headline and revocation the backstop. That is the true order, even if it is the quieter one.

The second was my own code turning on me. I kept writing the value into the receipt, until I saw that my audit log had quietly become a second copy of the data I claimed to protect. Now it keeps a salted hash.

The third is a line I chose to draw in the open instead of hiding it. The AI Passport is not generally available yet, so the Passport, the agents, and the authorization server are simulated in the browser. The cryptography is real. The integration is not, and the page says so out loud.

## Accomplishments that we're proud of

The security is not a costume. The token, the revocation, and the ledger are genuine Web Crypto, and a technical judge can open the source and check every claim.

The design tells the truth about its own limits. Most demos bury the awkward part; this one puts the already-read problem on the screen and answers it with a smaller grant instead of a magic undo.

Even the audit trail keeps its own promise. It proves what was read without holding on to the reading.

And it is small. One file, offline, no dependencies, twenty-eight tests, readable in an afternoon.

## What we learned

That the field named this problem all through 2026, and consumer tools still walk past it. That the strong move is not a bigger revoke, it is a smaller grant. And that a proven primitive, the Macaroon from 2014, beats inventing cryptography over a weekend.

## What's next for Salvoconducto

Delegation chains, where one agent hires another and scope can only shrink down the line, with a revoke that cascades to every hop. Real integration the day the Passport opens its doors. And a version built for the person filing an actual claim, on an actual hard day, who should be the last one made to fight the machine.
