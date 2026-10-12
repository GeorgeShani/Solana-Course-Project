# Screen audit · after M9 (H1 to H7)

26 PNG captures of the same routes as [../audit-2026-10-12/](../audit-2026-10-12/), taken on 2026-10-12 (machine clock) after the M9 fixes, against the local dev app (`:5173`) and API (`:3001`) with the curated data loaded. The earlier folder is kept unchanged for comparison.

Re-run (a new folder each time; the script refuses to write over an existing audit):

```bash
AUDIT_DIR=audit-<name> bun run --cwd app screens
```

What changed against the first audit:

| File                                  | Change                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `03-interval.png`                     | All four scenes (Pick, Source, Watch, Update) show; the script now waits for the last one.           |
| `02`, `03`, `04`, `17`                | No horizontal offset or clipped logo on Discover and the Interval, desktop or phone.                 |
| `08-updates-watching.png`             | The watched idea has the label a real Watch stores ("title · trader"), not a script label.           |
| `13-account.png`, `19-account-phone`  | "Follow a plan" needs a Google sign-in and a wallet, and the sign-in copy says so.                   |
| `14-about.png`                        | The third step reads "Recorded" (manual coverage), and the "Claim your profile · soon" pill is gone. |
| `10-plans-feed.png`, `18-plans-phone` | No stage-floor band under the empty message.                                                         |

Still not captured: plan detail, follow review and receipt. `GET /plans/feed` returned zero items, because no plan has been published to the devnet program yet (see ROADMAP, M9 H5).
