import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cue } from "../../../components/cue/Cue";
import { Icon } from "../../../components/ui/Icon";
import {
  formatWhen,
  latestUpdateLabel,
  safeHref,
  sameSource,
  sourceHost,
  type FeedItemView,
  type IdeaSummary,
  type RelationshipBasis,
  type TraderSummary,
} from "../model";
import { Avatar } from "./Avatar";
import { WatchButton } from "./WatchButton";

type Screen =
  | { kind: "idea"; key: string; idea: IdeaSummary }
  | { kind: "detected"; key: string; item: FeedItemView }
  | { kind: "end" };

/** "5m", "3h", "2d", "9 Oct": short enough for a chip; the exact time is in the tooltip. */
function ago(iso: string | null, now: number): string {
  if (iso === null) return "date unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "date unknown";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  if (s < 14 * 86_400) return `${Math.round(s / 86_400)}d`;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const TRACK: Record<
  RelationshipBasis | "none",
  { caption: string; line: "solid" | "dashed" | "dotted" | "none" }
> = {
  creator_confirmed: { caption: "Author-linked update", line: "solid" },
  editorially_associated: { caption: "Same topic", line: "dashed" },
  uncertain: { caption: "Link unconfirmed", line: "dotted" },
  original: { caption: "Original", line: "none" },
  none: { caption: "No update yet", line: "none" },
};

/**
 * The relationship between an original and its later item, drawn instead of explained: two nodes,
 * joined by a solid line when the author linked them, dashed for the same topic, dotted when
 * Relay could not confirm it, and a lone node when nothing later is recorded.
 */
function Track({ basis }: { basis: RelationshipBasis | null }) {
  const t = TRACK[basis ?? "none"];
  const tip =
    latestUpdateLabel({
      latestUpdate: basis ? { basis, occurredAt: null } : null,
    }) ?? "No later item recorded yet";
  return (
    <div className="track" data-line={t.line} title={tip}>
      <svg viewBox="0 0 240 24" role="img" aria-label={t.caption}>
        <circle className="track__node" cx="14" cy="12" r="7" />
        {t.line !== "none" ? (
          <>
            <line
              className="track__line"
              x1="22"
              y1="12"
              x2="218"
              y2="12"
              pathLength={1}
            />
            <circle
              className="track__node track__node--later"
              cx="226"
              cy="12"
              r="7"
            />
          </>
        ) : (
          <line className="track__stub" x1="26" y1="12" x2="120" y2="12" />
        )}
      </svg>
      <span className="track__caption">{t.caption}</span>
    </div>
  );
}

/**
 * Discover: one idea per screen, snapping as you swipe, scroll or press J / K. Pictures and motion
 * carry the meaning; words are the few that matter. Recorded ideas first, then the newest posts
 * detected automatically in the authors' own feeds (marked "Unreviewed"). No auto-advance, no
 * ranking by anything but time.
 */
export function IdeaStream({
  ideas,
  detected,
  people,
  trader,
  feedError,
  loading,
}: {
  ideas: readonly IdeaSummary[];
  detected: readonly FeedItemView[];
  people: readonly TraderSummary[];
  trader: string | undefined;
  /** The automatic feed could not be read; the recorded ideas are still shown. */
  feedError: boolean;
  loading: boolean;
}) {
  // Detected posts wait for the recorded ideas: the browser keeps whichever screen it snapped to,
  // so posts arriving first would leave the reader on one of them instead of on the first idea.
  const extra = useMemo(
    () =>
      loading
        ? []
        : detected.filter(
            (d) =>
              (trader === undefined || d.trader.id === trader) &&
              !ideas.some((i) => sameSource(i.original.url, d.url)),
          ),
    [detected, ideas, trader, loading],
  );

  const screens = useMemo<Screen[]>(
    () => [
      ...ideas.map((idea): Screen => ({ kind: "idea", key: idea.id, idea })),
      ...extra.map((item): Screen => ({
        kind: "detected",
        key: `d${item.id}`,
        item,
      })),
      ...(loading && ideas.length === 0 ? [] : [{ kind: "end" } as const]),
    ],
    [ideas, extra, loading],
  );

  const feedRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Where the reader is heading, so quick key presses keep moving instead of waiting for the scroll.
  const heading = useRef(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (
            e.isIntersecting &&
            e.intersectionRatio > 0.6 &&
            e.target instanceof HTMLElement
          ) {
            const i = Number(e.target.dataset.index);
            if (Number.isInteger(i)) {
              heading.current = i;
              setActive(i);
            }
          }
      },
      { root, threshold: [0.6] },
    );
    for (const el of root.querySelectorAll("[data-index]")) io.observe(el);
    return () => io.disconnect();
  }, [screens.length]);

  const go = useCallback((to: number) => {
    const root = feedRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-index="${to}"]`);
    if (!el) return;
    heading.current = to;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Scroll the feed itself, never the page around it.
    root?.scrollTo({
      top: el.offsetTop,
      behavior: reduce ? "auto" : "smooth",
    });
    el.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (t instanceof HTMLElement &&
          (t.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
            t.closest("[role=menu], [role=tablist]")))
      )
        return;
      const next =
        e.key === "j" || e.key === "ArrowDown" || e.key === "PageDown"
          ? heading.current + 1
          : e.key === "k" || e.key === "ArrowUp" || e.key === "PageUp"
            ? heading.current - 1
            : null;
      if (next === null || next < 0 || next >= screens.length) return;
      e.preventDefault();
      go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, screens.length]);

  const latestSeqOf = (traderId: string) =>
    people.find((p) => p.id === traderId)?.latestSeq ?? null;
  const pct = screens.length > 1 ? (active / (screens.length - 1)) * 100 : 0;

  return (
    <div className="stream-wrap" data-cursor-zone>
      <div className="stream__bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <h1 className="sr-only" data-page-start tabIndex={-1}>
        Discover
      </h1>

      {people.length > 1 && (
        <nav className="stream__people" aria-label="Show ideas by">
          <Link
            to="/"
            search={{}}
            className="ring ring--all"
            aria-current={trader === undefined}
            title="Everyone"
          >
            <Icon name="traders" size={20} />
            <span className="sr-only">Everyone</span>
          </Link>
          {people.map((p) => (
            <Link
              key={p.id}
              to="/"
              search={{ trader: p.id }}
              className="ring"
              aria-current={trader === p.id}
              title={p.displayName}
            >
              <Avatar id={p.id} name={p.displayName} />
              <span className="sr-only">{p.displayName}</span>
            </Link>
          ))}
        </nav>
      )}

      <div
        ref={feedRef}
        className="stream"
        role="feed"
        aria-label="Public trading ideas"
        aria-busy={loading}
      >
        {screens.length === 0 && (
          <article
            className="scr scr--wait"
            aria-label="Loading ideas"
            aria-busy="true"
          >
            <span
              className="avatar avatar--hero avatar--wait"
              aria-hidden="true"
            />
            <span className="wait__bar" aria-hidden="true" />
            <span className="wait__bar wait__bar--short" aria-hidden="true" />
          </article>
        )}
        {screens.map((s, i) => {
          const common = {
            "data-index": i,
            "data-active": i === active,
            tabIndex: -1,
            "aria-posinset": i + 1,
            "aria-setsize": screens.length,
          } as const;

          if (s.kind === "end")
            return (
              <article
                key="end"
                className="scr scr--end"
                {...common}
                aria-label="End"
              >
                <Cue pose="saved" className="scr__cue cue--lit" />
                <div className="scr__row">
                  <button
                    type="button"
                    className="orb"
                    onClick={() => go(0)}
                    aria-label="Back to the top"
                  >
                    <Icon name="arrow-up" size={26} />
                  </button>
                  <Link to="/updates" className="orb" aria-label="Updates">
                    <Icon name="updated" size={26} />
                  </Link>
                  <Link
                    to="/plans"
                    className="orb"
                    aria-label="Plans published through Relay"
                  >
                    <Icon name="plans" size={26} />
                  </Link>
                </div>
                {feedError && (
                  <p className="scr__warn" role="status">
                    <Icon name="alert" size={16} /> Live feed unavailable
                  </p>
                )}
              </article>
            );

          const isIdea = s.kind === "idea";
          const person = isIdea ? s.idea.trader : s.item.trader;
          const title = isIdea ? s.idea.title : s.item.title;
          const url = isIdea ? s.idea.original.url : s.item.url;
          const when = isIdea
            ? s.idea.original.publishedAt
            : s.item.publishedAt;
          const href = safeHref(url);
          const host = sourceHost(url);

          return (
            <article
              key={s.key}
              className="scr"
              data-author={person.id}
              data-kind={s.kind}
              {...common}
              aria-label={`${title}, ${person.displayName}`}
            >
              <Link
                to="/profiles/$traderId"
                params={{ traderId: person.id }}
                className="scr__who"
                title={`${person.displayName} · public-source profile, not claimed by the author`}
              >
                <Avatar
                  id={person.id}
                  name={person.displayName}
                  className="avatar--hero"
                />
                <span className="scr__name">{person.displayName}</span>
              </Link>

              {!isIdea && (
                <p className="scr__chips">
                  <span className="chip chip--new">
                    <i aria-hidden="true" /> New
                  </span>
                  <span
                    className="chip chip--quiet"
                    title="Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea."
                  >
                    Unreviewed
                  </span>
                </p>
              )}

              <h2 className="scr__title">{title}</h2>

              {isIdea ? (
                <Track basis={s.idea.latestUpdate?.basis ?? null} />
              ) : null}

              <div className="scr__chips scr__chips--meta">
                {isIdea && s.idea.assets.length > 0 && (
                  <span className="chip">
                    {s.idea.assets.slice(0, 3).join(" · ")}
                  </span>
                )}
                {host && <span className="chip chip--quiet">{host}</span>}
                <span className="chip chip--quiet" title={formatWhen(when)}>
                  <Icon name="clock" size={12} /> {ago(when, now)}
                </span>
              </div>

              {isIdea &&
                s.idea.original.displayedContent &&
                !s.idea.original.contentRemoved && (
                  <details className="scr__peek">
                    <summary aria-label="What it says">
                      <Icon name="details" size={16} />
                    </summary>
                    <p>{s.idea.original.displayedContent}</p>
                  </details>
                )}

              <div className="rail">
                <WatchButton
                  variant="rail"
                  type={isIdea ? "idea" : "trader"}
                  id={isIdea ? s.idea.id : s.item.trader.id}
                  label={
                    isIdea
                      ? `${s.idea.title} · ${s.idea.trader.displayName}`
                      : s.item.trader.displayName
                  }
                  seenSeq={
                    isIdea ? s.idea.latestSeq : latestSeqOf(s.item.trader.id)
                  }
                />
                {href && (
                  <a
                    className="rail__btn"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label="Open the original"
                  >
                    <Icon name="external" size={26} />
                    <span className="rail__label">Source</span>
                  </a>
                )}
                {isIdea && (
                  <Link
                    to="/ideas/$ideaId"
                    params={{ ideaId: s.idea.id }}
                    className="rail__btn"
                    aria-label="See the timeline"
                  >
                    <Icon name="chain" size={26} />
                    <span className="rail__label">Story</span>
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
