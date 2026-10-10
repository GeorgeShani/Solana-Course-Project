import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState, type ReactNode, type Ref } from "react";
import { Cue, type CuePose } from "../cue/Cue";
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
  pose,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "error";
  busy?: boolean;
  pose?: CuePose;
}) {
  return (
    <section className="stage-msg" data-tone={tone} aria-busy={busy}>
      <div className="stage-msg__body">
        {pose ? (
          <Cue pose={pose} className="stage-msg__cue cue--lit" />
        ) : (
          <div className="stage-msg__arch" aria-hidden="true" />
        )}
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
      pose="unavailable"
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
        </>
      }
    >
      <p className="stage-msg__text">
        {kind === "contract"
          ? "The feed answered, but not in the expected format, so no plans are shown."
          : "The feed comes from Relay's server, which didn't respond. No plans are shown instead of guessing."}
      </p>
      <p className="stage-msg__detail">{message}</p>
      <p className="stage-msg__aside">
        While you wait, a separate <Link to="/demo">fictional demo</Link> shows
        how Relay works with simulated prices. It never mixes into the feed.
      </p>
      {DEV && kind === "unavailable" && (
        <details className="stage-msg__dev">
          <summary>Development setup</summary>
          <p>
            A 502 here means the dev proxy could not reach the API on port 3001.
            Start it with <code>bun run dev:server</code>. It reads{" "}
            <code>DATABASE_URL</code> from <code>server/.env</code>; for a local
            database run <code>docker compose -f compose.dev.yaml up -d</code>.
          </p>
          <p>
            <Link to="/" search={{ preview: "fictional" }}>
              Open the fictional feed preview
            </Link>{" "}
            to check layout without the API.
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
      pose="discover"
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
          <Link to="/traders" className="btn btn--glass">
            <Icon name="traders" />
            Browse traders
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
        <motion.div
          className="finale__cue"
          initial={false}
          animate={
            shown && !reduce
              ? { y: [28, 0, 0, 6, 0], opacity: [0, 1, 1, 1, 1] }
              : { y: 0, opacity: shown ? 1 : 0 }
          }
          transition={
            reduce
              ? { duration: 0 }
              : {
                  delay: 0.7,
                  duration: 1.6,
                  times: [0, 0.35, 0.6, 0.8, 1],
                  ease: EASE,
                }
          }
        >
          <Cue pose="bow" className="cue--lit" />
        </motion.div>
        <p className="finale__line">That's tonight's lineup.</p>
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
          <Link to="/watchlist" className="btn btn--primary">
            <Icon name="star" />
            {watched.length > 0 ? "Review your Watchlist" : "Open Watchlist"}
          </Link>
          <button type="button" className="btn btn--glass" onClick={onReplay}>
            <Icon name="replay" />
            Explore again
          </button>
        </div>
        <div className="finale__links">
          <Link to="/traders">Browse traders</Link>
          <button type="button" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh the lineup"}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
