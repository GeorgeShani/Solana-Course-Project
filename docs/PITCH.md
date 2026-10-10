# Relay: the 2-minute pitch

Spoken at a slow pace (about 125 words a minute) with real pauses. The text is about 210 words, which lands at roughly 2:05-2:15 once the pauses are counted. Rehearse it once with a timer and trim using the "if you run long" list below.

## How to deliver it

- **Start quietly.** The first line is a scene, not a greeting. Do not say your name or "today I'll present". If someone needs your name, the host or the slide has it.
- **`[pause]` is one slow breath (about 1.5 seconds). `[long pause]` is about 3 seconds.** Do not fill them. A silence after "It just wasn't about you" does more than any extra sentence.
- **Look at one person per sentence**, not at the slides.
- **Slow down on the lines in bold.** They are the whole pitch.
- Web3 words are used on purpose and sparingly: _on-chain_, _blockchain_, _Solana_, _Jupiter_. Each one is followed by what it means in plain language.

---

## The pitch

**[Start quietly. Look up.]**

Picture your Tuesday morning. `[pause]`

You're scrolling. A trader you follow posts a screenshot: plus forty percent. `[pause]` You think, _I'm in._ `[pause]` You buy. Twenty minutes later... you're losing money. `[long pause]`

**The screenshot wasn't lying.** `[pause]` **It just wasn't about you.** `[pause]`

He got in at nine. You got in at nine-forty, at a higher price. Nobody shows you that part. `[pause]`

That's why we're building Relay. `[pause]`

Relay is a feed of trade plans. Each plan shows where the creator wanted to get in, and when the idea expires. `[pause]` And Relay answers one simple question: _is this idea still available to me?_ `[pause]` If the price has moved on, we say so. If it expired, we say so. `[pause]` If you follow, you approve every trade yourself. `[pause]`

Afterwards, you don't see a screenshot. You see what happened to the people who _actually_ followed. `[pause]`

Here's where Solana matters. Every plan is saved on-chain, with the time it was posted. Nobody can change it afterwards. Updates are added, never edited. `[pause]` And every follow leaves a receipt on the blockchain. **We're not asking you to trust us. The chain keeps the receipts.** `[pause]`

Relay won't tell you what to buy. It tells you the truth about the trade. `[long pause]`

Next time you see a screenshot, you shouldn't have to guess. `[long pause]`

Thank you.

---

## If you run long (cut in this order)

1. "Each plan shows where the creator wanted to get in, and when the idea expires." can become "Each plan has an entry and an expiry."
2. "Updates are added, never edited."
3. "He got in at nine. You got in at nine-forty, at a higher price." can become "He got in early. You got in late."

If you have 15 seconds to spare instead, add this line after the Solana part, and mention it is a simulated copy of mainnet if asked:

> "We've already built the core, and tested it with real swap routes through Jupiter."

## Why it is written this way

| Choice                                                             | Reason                                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opens with a scene in "you" form                                   | The audience is in the story before they know the product exists. They feel the problem before you name it.                                                          |
| One idea per sentence                                              | Easy to say slowly, easy for a stranger to follow without slides.                                                                                                    |
| "Plan", "entry", "receipt" instead of "alpha", "DeFi", "trustless" | A judge who does not trade can still repeat what you said.                                                                                                           |
| The Solana part is two sentences, both about a _benefit_           | People remember "nobody can change it afterwards" and "the chain keeps the receipts", not how a program account works.                                               |
| Ends on "you shouldn't have to guess", then a plain "Thank you"    | The last idea is the one you want remembered. The slogan ("Don't follow the screenshot. Follow the receipt.") is kept for the closing slide instead of being spoken. |

The opening story is a made-up illustration, so it starts with "Picture". If one of you has a true story like this, use it instead and say "this happened to me". A real one will land harder.

## Two alternative openings

Keep the rest of the pitch unchanged from "The screenshot wasn't lying."

**A. Shorter, sharper**

> "Plus forty percent in a day." `[pause]` "That's what the screenshot said. `[pause]` So I bought. `[pause]` And I lost."

**B. From the creator's side**

> "Imagine you're a trader who got it right. `[pause]` You post your win. `[pause]` Thousands see it, and most of them can't get that price any more. `[pause]` And when it goes wrong for them, they blame you."

## What you can safely say, and what you cannot

**Safe to say** (all true as of the last commit):

- The on-chain Solana program exists: plans, append-only versions, and receipts that only exist if a real in-range swap happened.
- It rejects fake receipts: calls through another program, a second wallet swapping into your account, extra signers.
- The backend verifies results by re-reading the blockchain, not by trusting the app.
- It was tested with real Jupiter swap routes on a simulated copy of mainnet (no real money).

**Do not say:**

- Any number of users, traction, revenue or "traders love it". There is no pilot yet.
- That it is live on mainnet, or that real money has moved through it.
- That an in-range plan is "safe", "recommended" or "profitable". The product itself says the opposite.
- That Relay invented social trading or copy trading. It did not (see the competitors below).

## Likely questions, with honest answers

**"Isn't this just copy trading?"**
No. Nothing is copied automatically. You review and approve each trade yourself, and the point of the product is the truth about outcomes, not faster buying. Others overlap with parts of this (FOMO, eToro, Bitget, TipRanks and similar), so we do not claim to have invented the category. Our bet is the whole loop in one place: check the entry, approve one trade, and see what really happened to followers.

**"Why does this need a blockchain? A database could do it."**
A database can be edited by whoever runs it, including us. On-chain, a creator cannot delete or rewrite a plan, and the receipt is produced by a program that looks at real token balances, so nobody, not even us, can invent one. Solana is fast and cheap enough that a receipt per trade is practical.

**"Can't a creator just use new wallets and hide the losses?"**
We cannot fully prevent that, and we say so. A plan can never be deleted, and we only count what we can actually observe, showing how much we can see. A linked wallet proves control of that wallet, not a person's whole history.

**"How do you make money?"**
Still a hypothesis: paid tools such as deeper history and comparisons. Never on users' losses, hidden spreads or fake urgency. The pilot is how we find out whether anyone pays.

**"Is this legal? Is it financial advice?"**
It is not advice, and an "in range" label never means safe or profitable. How regulators classify a product like this depends on the country and the model, so that review is a launch gate, not something we are skipping.

**"Who is the first user?"**
An adult who already trades Solana spot and follows trade ideas on social media.

**"Where is it today?"**
The core is built and tested: the on-chain program, the verification backend, and real Jupiter swap routes on a simulated mainnet. The mobile feed interface is what we are building next, and then a small pilot with about 10 creators and 50-100 users, with success thresholds set before we start.
