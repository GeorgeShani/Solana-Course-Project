import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, type ReactNode, type Ref } from "react";
import { Avatar } from "../theatre/Portrait";
import { Icon } from "../ui/Icon";
import { useCalmMotion } from "../../lib/motion";

const DEV = import.meta.env.DEV;
const EASE = [0.16, 1, 0.3, 1] as const;

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
      <div className="stage-msg__body">
        <div className="stage-msg__arch" aria-hidden="true" />
        <h1 className="stage-msg__title">{title}</h1>
        {children}
        {actions && <div className="stage-msg__actions">{actions}</div>}
      </div>
    </section>
  );
}

/** Shown while the first page is on its way (route navigation back to the feed). */
export function FeedLoading() {
  return (
    <StageMessage title="Setting the stage" busy>
      <p className="stage-msg__text" role="status">
        Loading plans from Relay…
      </p>
    </StageMessage>
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
      title={
        kind === "contract"
          ? "Relay sent data this app can't read"
          : "Relay's service is unavailable"
      }
      actions={
        <>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRetry}
            disabled={checking}
          >
            <Icon name="refresh" />
            {checking ? "Checking…" : "Try again"}
          </button>
          {DEV && (
            <Link
              to="/"
              search={{ preview: "fictional" }}
              className="btn btn--glass"
            >
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
            Start the API with <code>bun run dev:server</code> (port 3001). It
            reads <code>DATABASE_URL</code> from <code>server/.env</code>; for a
            local database run{" "}
            <code>docker compose -f compose.dev.yaml up -d</code>.
          </p>
        </details>
      )}
    </StageMessage>
  );
}

export function EmptyState({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <StageMessage
      title="No open plans right now"
      busy={refreshing}
      actions={
        <>
          <button
            type="button"
            className="btn btn--glass"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <Icon name="refresh" />
            {refreshing ? "Checking…" : "Check again"}
          </button>
          <Link to="/search" className="btn btn--glass">
            <Icon name="search" />
            Search plans
          </Link>
        </>
      }
    >
      <p className="stage-msg__text">
        Plans appear here once a creator commits one onchain. Expired and closed
        plans stay listed with their history.
      </p>
    </StageMessage>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "warn" | "preview";
  children: ReactNode;
}) {
  return (
    <div
      className="banner"
      data-tone={tone}
      role={tone === "warn" ? "status" : undefined}
    >
      <Icon name="alert" size={18} />
      <div>{children}</div>
    </div>
  );
}

export interface CastMember {
  seed: string;
  name: string;
}

export interface WatchedPlan {
  planPda: string;
  label: string;
  seed: string;
}

/**
 * The closing curtain at the end of the feed, from the curtain-sol "Fin." scene. The drapes close
 * over the stage when it becomes the active act, then the curtain call, the tally and the watched
 * plans come up. Every count comes from the plans above; nothing is invented.
 */
export function Finale({
  cast,
  tally,
  total,
  watched,
  hasMore,
  loadingMore,
  refreshing,
  onRefresh,
  onReplay,
  onGoTo,
  active,
  sectionRef,
}: {
  cast: CastMember[];
  tally: [string, number][];
  total: number;
  watched: WatchedPlan[];
  hasMore: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReplay: () => void;
  onGoTo: (planPda: string) => void;
  active: boolean;
  sectionRef: Ref<HTMLElement>;
}) {
  const reduce = useCalmMotion();
  // The scene plays once per visit to the finale, then stays put.
  const [played, setPlayed] = useState(false);
  if (active && !played) setPlayed(true);
  const shown = reduce || played;

  if (hasMore) {
    return (
      <section
        ref={sectionRef}
        className="finale finale--loading"
        aria-busy={loadingMore}
        data-plan="__finale"
        tabIndex={-1}
      >
        <p className="finale__loading">
          {loadingMore ? "Loading more plans…" : "More plans below"}
        </p>
      </section>
    );
  }
  const drape = (side: 1 | -1) => (
    <motion.div
      className={`drape drape--${side === 1 ? "left" : "right"} finale__drape`}
      aria-hidden="true"
      initial={false}
      animate={
        shown ? { scaleX: 1, skewY: 0 } : { scaleX: 0.14, skewY: side * 2 }
      }
      transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE }}
    />
  );
  return (
    <section
      ref={sectionRef}
      className="finale"
      data-active={active}
      data-plan="__finale"
      aria-labelledby="finale-title"
      tabIndex={-1}
    >
      {drape(1)}
      {drape(-1)}
      <motion.div
        className="finale__body"
        initial={false}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={
          reduce ? { duration: 0 } : { delay: shown ? 0.5 : 0, duration: 0.5 }
        }
      >
        <motion.h2
          id="finale-title"
          className="finale__fin"
          initial={false}
          animate={
            shown ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }
          }
          transition={
            reduce ? { duration: 0 } : { delay: 0.6, duration: 0.9, ease: EASE }
          }
        >
          Fin.
          <span className="sr-only"> You've seen every plan in the feed.</span>
        </motion.h2>
        <ul
          className="finale__cast"
          aria-label="Curtain call: creators in this feed"
        >
          {cast.slice(0, 8).map((c, i) => (
            <motion.li
              key={c.seed}
              title={c.name}
              initial={false}
              animate={
                shown && !reduce
                  ? { y: [40, 0, 6, 0], rotate: [0, 0, 8, 0], opacity: 1 }
                  : { y: 0, opacity: 1 }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : { delay: 0.8 + i * 0.12, duration: 1.1, ease: EASE }
              }
            >
              <Avatar seed={c.seed} size={40} />
              <span className="sr-only">{c.name}</span>
            </motion.li>
          ))}
        </ul>
        <ul className="finale__tally" aria-label="Plans by entry status">
          <li className="num">
            {total} {total === 1 ? "plan" : "plans"}
          </li>
          {tally.map(([label, n]) => (
            <li key={label}>
              {label} · <span className="num">{n}</span>
            </li>
          ))}
        </ul>
        {watched.length > 0 && (
          <div className="finale__watched">
            <h3 className="finale__subhead">You're watching</h3>
            <ul>
              {watched.map((w) => (
                <li key={w.planPda}>
                  <button
                    type="button"
                    className="chip chip--button"
                    onClick={() => onGoTo(w.planPda)}
                  >
                    <Avatar seed={w.seed} size={24} />
                    {w.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="finale__actions">
          <button type="button" className="btn btn--glass" onClick={onReplay}>
            <Icon name="replay" />
            Replay from the first act
          </button>
          <Link to="/search" className="btn btn--primary">
            <Icon name="search" />
            Search plans
          </Link>
        </div>
        <div className="finale__links">
          <Link to="/me">My Plans</Link>
          <button type="button" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh the lineup"}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
