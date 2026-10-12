# Screen audit · 2026-10-12

26 PNG captures of every user-facing route (desktop + phone), taken with Playwright against the local stack (`:5173` + `:3001`).

Re-run:

```bash
bun run --cwd app scripts/capture-screens.ts
```

| File | Screen |
| ---- | ------ |
| `01-welcome.png` | Closed-curtain welcome |
| `02-discover.png` | Discover stream |
| `03-interval.png` | Interval / Showtime |
| `04-discover-ticket-2.png` | Discover · second ticket |
| `05-profile-*.png` | Public-source profiles (×3) |
| `06-idea-*.png` | Idea timelines (×4) |
| `07-updates-empty.png` | Updates · nothing watched |
| `08-updates-watching.png` | Updates · one idea watched |
| `09-watchlist-*.png` | Watchlist tabs |
| `10-plans-feed.png` | Plans feed (empty on this stack) |
| `11-plans-creators.png` | Plan creators |
| `13-account.png` | Account |
| `14-about.png` | About |
| `15-demo.png` | Fictional demo |
| `16-dev-plan-states.png` | Dev plan fixtures |
| `17-discover-phone.png` | Discover · 390×844 |
| `18-plans-phone.png` | Plans · phone |
| `19-account-phone.png` | Account · phone |

No plan-detail capture: `GET /plans/feed` returned zero items (no onchain plans mirrored yet).
