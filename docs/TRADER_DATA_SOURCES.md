# Real trader data for Relay: sources compared

Research date: 2026-10-10. Everything below was read from vendor documentation or search results on that date. Prices and limits change, so re-check the linked page before you subscribe. **[V]** means read on the vendor's own docs page. **[S]** means only seen in a search snippet or a third-party page, so treat it as unconfirmed.

## The rule that decides everything

Relay's product claim is that numbers are _verified from the chain_. Third-party PnL is not. It is a vendor's own reconstruction of someone's trades, with its own price source, cost-basis method and token coverage. So:

| Kind of number                                                           | Where it comes from                                      | How it is labelled                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Follower outcomes, creator observed entry, receipts                      | **Relay's own program and server** (already built, free) | "Verified by Relay receipt"                                       |
| Anything about a wallet's trading outside Relay (PnL, win rate, history) | A third-party API from this document                     | "Third-party estimate. Not verified by Relay. May be incomplete." |

Never mix the two in one statistic, and never rank the feed by third-party PnL (the plan already forbids ranking by claimed return).

## Shortlist

| Source                                                                                  | Wallet PnL                                                                  | Top-trader leaderboard                           | Raw history / identity                                                                   | MCP                                                                                 | Starting price                                                                                             | Best use in Relay                                                                         |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **[Solana Tracker](https://docs.solanatracker.io/guides/pnl-v2/overview)**              | Yes, realized, unrealized, win rate, per-token positions, daily history [V] | Yes, all wallets (top 500k) and KOL wallets [V]  | Holdings, trades, wallet chart [V]                                                       | Third-party "SolTracker MCP" [S]                                                    | Free tier, then €50/mo [V]                                                                                 | **Primary pick**: cheapest, Solana-only, PnL and leaderboard in one place                 |
| **[Vybe Network](https://docs.vybenetwork.com/reference/get_wallet_pnl_v4)**            | Yes, `GET /v4/wallets/{address}/pnl` [V]                                    | Top traders by token and overall [S]             | Transfers, trades, labels [S]                                                            | **Hosted MCP** at `https://docs.vybenetwork.com/mcp` with an `X-API-KEY` header [S] | $299/mo (Pro); a free tier exists but is not described [V]                                                 | Second pick, and the easiest to explore through an agent                                  |
| **[Birdeye](https://data.birdeye.so/docs/changelog/20251024-release-wallet-pnl-api)**   | Yes, `GET /wallet/v2/pnl/summary` and a per-token details endpoint [V/S]    | Not confirmed                                    | Portfolio, trades, prices [S]                                                            | Not confirmed                                                                       | Free, $99, $199 per month and up; the wallet API group has lower rate limits [V]                           | Good if you also need token prices and charts; check which plan includes the wallet group |
| **[Helius Wallet API](https://www.helius.dev/docs/wallet-api/overview.md)**             | No                                                                          | No                                               | Balances, history with balance changes, transfers, historical balance, **funded-by** [V] | **Official MCP** (`helius-mcp`) [S]                                                 | Free plan covers balances, history, transfers; identity, batch-identity and funded-by need a paid plan [V] | Raw material you can verify yourself, plus wallet identity and "who funded this wallet"   |
| **[Nansen](https://docs.nansen.ai/mcp/overview)**                                       | Yes (Profiler `pnl`, `pnl-summary`) [V]                                     | Exists, but **redistribution is prohibited** [V] | Balances, transactions, counterparties [V]                                               | **Official MCP**: 12 curated tools via OAuth, 50 via API key [V]                    | Credit-based, price not listed on the pages read                                                           | Rich data, but see the licence caveat below                                               |
| **[Zerion](https://developers.zerion.io/reference/getting-started)**                    | Yes, FIFO cost basis, excludes assets without prices [S]                    | No                                               | Positions, decoded transactions, webhooks for Solana [S]                                 | Not confirmed                                                                       | Free developer plan: 2K requests/day, 10 rps [S]                                                           | A generic wallet portfolio view; weaker for trader discovery                              |
| **[Codex](https://www.codex.io/for/wallets)**                                           | Gains, losses, per wallet or position [S]                                   | "Discover high-performing traders" [S]           | Balances, transactions [S]                                                               | Not confirmed                                                                       | Sources conflict (free tier vs from $350) [S]                                                              | Check only if you want one GraphQL API for prices and wallets                             |
| **[Cielo](https://madeonsol.com/api-alternatives/cielo)**                               | FIFO realized and unrealized, win rate [S]                                  | Leaderboard and search [S]                       | Wallet feeds [S]                                                                         | No                                                                                  | Credit-based [S]                                                                                           | Not worth the uncertainty for a 3-day demo                                                |
| **[Bitquery](https://docs.bitquery.io/docs/mcp/solana/)**                               | You compute it                                                              | You compute it                                   | Raw Solana DEX trades and transfers over GraphQL [S]                                     | Hosted MCP: `claude mcp add --transport http bitquery https://mcp.bitquery.io` [S]  | Free tier [S]                                                                                              | Fallback when you want raw trades and your own PnL rules                                  |
| **[Dune](https://docs.dune.com/data-catalog/curated/dex-trades/solana/overview)**       | You write SQL                                                               | You write SQL                                    | Curated `dex_solana.trades`, refreshed about every 3 hours [S]                           | Only community servers, no wallet-trades tool [S]                                   | API key needed                                                                                             | Batch analysis and backtests, not a live profile                                          |
| **[Moralis](https://docs.moralis.com/data-api/universal/pnl/overview)**                 | PnL documented for EVM; Solana PnL **not confirmed** [S]                    | Top traders by token (EVM)                       | Solana balances and swap history [S]                                                     | Not confirmed                                                                       | Free tier                                                                                                  | Skip for PnL                                                                              |
| **[Jupiter Portfolio API](https://developers.jup.ag/docs/portfolio/jupiter-positions)** | No                                                                          | No                                               | Positions in **Jupiter products only**; beta [V]                                         | No                                                                                  | API key, billing on the new platform [V]                                                                   | Not trader data; maybe later to show a follower's open Jupiter positions                  |
| **GMGN**                                                                                | In its web app                                                              | Yes, in its web app                              | Closed API per a competitor [S]                                                          | No                                                                                  | Unclear                                                                                                    | Do not build on it                                                                        |

## What each top candidate gives you

### Solana Tracker (recommended primary)

- **PnL V2** under `https://data.solanatracker.io/v2/pnl`, key in the `x-api-key` header [V].
  - `/v2/pnl/wallets/{wallet}`: summary with PnL, win rate, token counts.
  - `/v2/pnl/wallets/{wallet}/positions`: per-token positions.
  - `/v2/pnl/leaderboard/top?days=30&sort=realized&direction=desc&limit=50`: Solana-wide ranking over 1, 7, 30 or 90 days. Covers the top 500k wallets.
  - `/v2/pnl/tokens/{token}/traders`: who traded a token, with their position and PnL.
  - Batch endpoint for wallet summaries with tags (bot, potential bot, arbitrage) for up to 100 wallets.
- **Caveats [V]:**
  - Coverage starts in December 2023, SPL tokens only. SOL and stablecoins are treated as quote assets and left out of positions.
  - Wallets are not indexed on request.
  - `pnlMode` changes results. `strict` (the default) drops positions where sells exceed buys.
  - `potential_bot` is a heuristic.
  - You must use the same mode and window when you compare wallets.
- **Pricing [V]:** Free is €0 for 2.5K requests a month at 3 requests a second. Advanced is €50 for 200K, and Pro is €200 for 1M. The page does not say which plans include the PnL and leaderboard endpoints, so confirm before paying.
- There is an official TypeScript SDK, `@solana-tracker/data-api` [S].

### Vybe Network

- `GET https://api.vybenetwork.xyz/v4/wallets/{ownerAddress}/pnl` with `X-API-KEY`, `resolution=1d|7d|30d|Full`, `limit` up to 1000 [V].
- Response has a `summary` (win rate, trade counts, volume, realized and unrealized PnL, a 7-day trend, best and worst token) and a per-token `tokenMetrics` list with buys, sells, last trade signature and block time [V]. The last-trade signature is useful: it lets you link a claim back to a transaction on an explorer.
- Only "vetted markets" are covered, and the page does not say which [V].
- Pro is $299/month for 7.5M credits at 1,500 requests a minute. The pricing page does not name individual endpoints or mention MCP [V].

### Helius (use for verifiable raw data)

- `GET /v1/wallet/{wallet}/history`, `/transfers`, `/balances`, `/balance-at` are on the free plan. `/identity`, `/batch-identity` (up to 100 at once) and `/funded-by` need a paid plan [V]. The API is beta, so formats may change [V].
- Amounts come back already divided by decimals, with `amountRaw` strings on some endpoints [V]. If you use them for anything that matters, use the raw strings.
- `funded-by` is the one genuinely useful trust signal: it shows when a "new creator" wallet was funded by another wallet. It supports the plan's honest caveat that a creator can use several wallets, but it cannot prove or disprove it.
- MCP: `helius-mcp` exposes wallet tools (names such as `getWalletHistory` and `getWalletFundedBy` appeared in a generated prompt file) [S]. Check the catalog for the exact names in your version.

### Nansen (read the licence first)

Nansen's [redistribution guidelines](https://docs.nansen.ai/guides/redistribution-guide.md) [V]:

- **Allowed without attribution:** Profiler `pnl` and `pnl-summary`, balances, historical balances.
- **Allowed with attribution** ("Powered by Nansen API" near the data): Profiler transactions, counterparties, related wallets, DEX trades, token flows.
- **Prohibited, internal use only:** address labels, smart-money holdings, `tgm/pnl-leaderboard`, smart-money DEX trades.

So you could show a wallet's PnL, but you could not build a "smart money leaderboard" screen on Nansen data. Cost is in credits per tool call, and the pages I read did not list prices.

## Using an MCP server vs an API

An MCP server is useful for **exploring** (asking an agent "show me this wallet's last 30 days") and for building fixtures. It is not what the app should call at runtime: the Relay server should call the vendor's REST API directly, with the key kept on the server, caching and rate limits in place (see `server/src/services/prices.ts` for the pattern). Candidates with an MCP: Helius (official), Vybe (hosted), Nansen (official), Bitquery (hosted). Add one to Claude Code with its own install command; I have not installed any of them.

## How this fits Relay

1. **Keep creators on-chain.** A Relay creator's profile numbers come from Relay receipts. A linked wallet proves control of that wallet, not a person's whole history (already in the plan and the pitch Q&A).
2. **Third-party data goes in a separate, labelled block.** Suggested copy: "Wallet activity outside Relay, estimated by [vendor]. Not verified by Relay. May be incomplete." Show the vendor, the window, `pnlMode` or resolution, and the fetch time.
3. **Do not name or rank real people from their trading.** A leaderboard of real wallets is public chain data, but pairing it with a name or social account, or implying they endorse Relay, is a privacy and legal risk. Show shortened addresses, or only labels the vendor publishes openly.
4. **Server-side only.** Keys never go in `VITE_*`. Cache for minutes, key by wallet, and respect the free-tier limits (Solana Tracker free is 2.5K requests a month, so a demo must cache hard).
5. **Fail visibly.** If the vendor is down or the wallet is outside its index, show "Outside-Relay history unavailable", never a zero or an empty chart.
6. **Fictional stays fictional.** Seeded demo creators keep their fictional badge. Real wallets from a vendor are a separate "Discover real traders" view, clearly not Relay creators and with no Relay plan attached.

## Recommended plan

- **Demo (3 days):** pick **Solana Tracker's free tier** (confirm the PnL endpoints work on it with one `curl`), add one server route that wraps it (for example `GET /traders/{address}/outside-relay`), cache it, and show it in the creator profile block described above. If the free tier does not include PnL, use Vybe's free tier or a Helius key for history only, or skip the block and keep Relay-only numbers (the demo does not depend on it).
- **Pilot:** add Helius for `funded-by` and identity (paid plan), and keep Solana Tracker or Vybe for PnL.
- **Later:** if you want your own PnL rules (so the number matches the plan's Section S method), compute it from raw swaps through Helius history or Bitquery rather than trusting a vendor figure.

## Before you commit money

1. Make one real request per candidate with a free key, using two wallets you can check by hand on an explorer. Compare the vendor's realized PnL with your own count of the trades.
2. Confirm in writing which plan includes the PnL and leaderboard endpoints (Solana Tracker, Birdeye).
3. Read each vendor's terms on **displaying data in a product** (only Nansen's were read here).
4. Check the legal point in the plan (copy-trading and "advice" classification) again, because showing a trader's past PnL next to a "follow" button makes the page look more like a recommendation.
