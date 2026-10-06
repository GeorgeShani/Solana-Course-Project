# Ideas

One folder per candidate idea. Keep ideas here until one is chosen; then promote it to the top-level docs and rename the program and app accordingly.

| Idea | Status | Notes |
|---|---|---|
| [legacy-vault](legacy-vault) | Candidate | Emergency / digital-inheritance vault. Has a [product plan](legacy-vault/product-plan.md) and an [idea validation](legacy-vault/idea-validation.md). |

## Adding an idea

Create `docs/ideas/<idea-name>/` with at least a `README.md` covering:

1. **Problem and user**: who is it for, and what hurts today.
2. **Why Solana**: what the chain gives that a normal backend doesn't.
3. **On-chain vs off-chain**: what the program must enforce and what the app/server can do.
4. **Core flow**: the smallest end-to-end path worth demoing.
5. **Risks and open questions**: what must be validated before building.

Then add a row to the table above.

## Choosing an idea

When one is picked:

- Rename the placeholder program crate `course_program` (see [program/README.md](../../program/README.md)) and update `Anchor.toml`, `scripts/sync-idl.ts`, `app/src/lib/program.ts`, and the IDL files in `app/src/idl/`.
- Replace the template counter (`program/programs/course_program/src/state.rs`, `instructions/`) and the app's `SmokeTest.tsx` with real instructions.
