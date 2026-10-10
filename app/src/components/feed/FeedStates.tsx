import { Link } from "@tanstack/react-router";
import type { ReactNode, Ref } from "react";
import { Icon } from "../ui/Icon";

const DEV = import.meta.env.DEV;

function StageMessage({
  title,
  children,
  actions,
  tone = "neutral",
  busy = false,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "error";
  busy?: boolean;
}) {
  return (
    <section className="stage-msg" data-tone={tone} aria-busy={busy}>
      <div className="stage-msg__spot" aria-hidden="true" />
      <div className="stage-msg__body">
        <h1 className="stage-msg__title">{title}</h1>
        {children}
        {actions && <div className="stage-msg__actions">{actions}</div>}
      </div>
    </section>
  );
}

/** The API is down: say so plainly. Nothing cached or invented is shown in its place. */
export function UnavailableState({
  kind,
  message,
  checking,
  onRetry,
}: {
  kind: "unavailable" | "contract";
  message: string;
  checking: boolean;
  onRetry: () => void;
}) {
  return (
    <StageMessage
      tone="error"
      busy={checking}
      title={kind === "contract" ? "Relay sent data this app can't read" : "Relay's service is unavailable"}
      actions={
        <>
          <button type="button" className="btn btn--primary" onClick={onRetry} disabled={checking}>
            <Icon name="refresh" />
            {checking ? "Checking…" : "Try again"}
          </button>
          {DEV && (
            <Link to="/" search={{ preview: "fictional" }} className="btn btn--ghost">
              Open fictional preview
            </Link>
          )}
        </>
      }
    >
      <p className="stage-msg__text">
        {kind === "contract"
          ? "The feed answered, but not in the expected format, so no plans are shown."
          : "The feed comes from Relay's server, which didn't respond. No plans are shown instead of guessing."}
      </p>
      <p className="stage-msg__detail">{message}</p>
      {DEV && kind === "unavailable" && (
        <details className="stage-msg__dev">
          <summary>Development setup</summary>
          <p>
            The server needs Postgres (<code>docker compose -f compose.dev.yaml up -d</code>), then{" "}
            <code>bun run dev:server</code>. Plans come from the Relay program on the local fork.
          </p>
        </details>
      )}
    </StageMessage>
  );
}

export function EmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <StageMessage
      title="No open plans right now"
      busy={refreshing}
      actions={
        <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={refreshing}>
          <Icon name="refresh" />
          {refreshing ? "Checking…" : "Check again"}
        </button>
      }
    >
      <p className="stage-msg__text">
        Plans appear here once a creator commits one onchain. Expired and closed plans stay listed with their history.
      </p>
    </StageMessage>
  );
}

export function Banner({ tone, children }: { tone: "warn" | "preview"; children: ReactNode }) {
  return (
    <div className="banner" data-tone={tone} role={tone === "warn" ? "status" : undefined}>
      <Icon name="alert" size={18} />
      <div>{children}</div>
    </div>
  );
}

/**
 * The closing curtain at the end of the feed. Drapes draw in from the wings when it becomes the
 * active act (instant under reduced motion). Counts come from the cards above, never invented.
 */
export function Finale({
  tally,
  total,
  watching,
  hasMore,
  loadingMore,
  refreshing,
  onRefresh,
  onTop,
  active,
  sectionRef,
}: {
  tally: [string, number][];
  total: number;
  watching: number;
  hasMore: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onTop: () => void;
  active: boolean;
  sectionRef: Ref<HTMLElement>;
}) {
  if (hasMore) {
    return (
      <section
        ref={sectionRef}
        className="finale finale--loading"
        aria-busy={loadingMore}
        data-plan="__finale"
        tabIndex={-1}
      >
        <p className="finale__loading">{loadingMore ? "Loading more plans…" : "More plans below"}</p>
      </section>
    );
  }
  return (
    <section
      ref={sectionRef}
      className="finale"
      data-active={active}
      data-plan="__finale"
      aria-labelledby="finale-title"
      tabIndex={-1}
    >
      <div className="finale__drape finale__drape--left" aria-hidden="true" />
      <div className="finale__drape finale__drape--right" aria-hidden="true" />
      <div className="finale__body">
        <h2 id="finale-title" className="finale__title">
          That's tonight's lineup
        </h2>
        <p className="finale__sub">You're caught up.</p>
        <ul className="finale__tally" aria-label="Plans by entry status">
          <li className="num">
            {total} {total === 1 ? "plan" : "plans"}
          </li>
          {tally.map(([label, n]) => (
            <li key={label}>
              <span className="num">{n}</span> {label}
            </li>
          ))}
          {watching > 0 && (
            <li>
              <span className="num">{watching}</span> watching
            </li>
          )}
        </ul>
        <div className="finale__actions">
          <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={refreshing}>
            <Icon name="refresh" />
            {refreshing ? "Refreshing…" : "Refresh lineup"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onTop}>
            <Icon name="arrow-up" />
            Back to the first act
          </button>
        </div>
      </div>
    </section>
  );
}
