# Curation: how real traders and ideas get into Relay

Relay does not scrape X, Telegram or any other platform. A person looks at a public source, decides it is worth recording, and writes down what it says in `curated.json`. `bun run --cwd server curate` checks the file strictly and loads it. Everything it loads is labelled **Manual coverage** in the API and the app. Nothing here claims automated monitoring.

`curated.json` starts empty on purpose. **No trader is added without the owner's confirmation of who they are and where their posts are.** `demo.json` is a separate, clearly fictional file for development (`"demo": true`; refused when `NODE_ENV=production`; never shown next to live data).

## What each trader needs

| Field              | Meaning                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ownerConfirmed`   | `{ "by": "<who>", "at": "YYYY-MM-DD" }`. Required for every real trader.                                                                                                             |
| `attributionBasis` | One sentence: why Relay says this account is this person.                                                                                                                            |
| `participation`    | `confirmed_participating` only if the trader agreed to be listed; otherwise `public_source_only`. Never implies endorsement.                                                         |
| `coverageLimits`   | What Relay cannot see for this trader (private groups, other accounts, other wallets).                                                                                               |
| `links[]`          | Official profile links (`https` only; `x`, `telegram`, `youtube` links must be on that platform) and wallets, each with an `identityBasis`.                                          |
| `sources[]`        | Captured statements: `url`, `publishedAt` (or `null` if unknown), `retrievedAt` (when you looked), a short `displayedContent` (500 characters at most) and the availability history. |
| `ideas[]`          | One idea per source: a faithful `title`, explicit `assets`, `statedConditions` quoted from the source (or `null`), and later `events`.                                               |

## Rules the loader enforces

- Every link is `https`, a public name (no IP addresses, no `localhost`), no credentials. The server **never visits** any of them.
- A wallet signature proves control of that wallet, not who the person is. Wallet links carry their own `identityBasis`; anything but `creator_confirmed` needs a `basisNote`.
- A relationship is `creator_confirmed`, `editorially_associated` or `uncertain`, with a note for the last two. **Two things that mention the same asset are not related.**
- A Relay plan (`relay_plan_published`) can be attached only to a trader with a `creator_confirmed` wallet link.
- `publishedAt` is what the source says. `retrievedAt` is when you captured it. They are never merged, and unknown stays `null`.
- No dates in the future. Text has no control characters and is NFC-normalised.
- Sources, ideas and events are append-only. If a recorded entry is wrong, add a `correction` event; a file that contradicts a recorded entry is refused whole. A source that disappears gets a new availability entry (`unavailable` or `removed`) and a `source_unavailable` event; the app then shows a tombstone, not the text.

Run `bun run --cwd server curate --check` before loading.
