import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cue } from "../../../components/cue/Cue";
import { Icon } from "../../../components/ui/Icon";
import {
  sameSource,
  type FeedItemView,
  type IdeaSummary,
  type TraderSummary,
} from "../model";
import {
  addStamp,
  levelOf,
  stampsOf,
  totalStamps,
  useStamps,
  type Stamp,
} from "../stamps";
import { swayDrapes } from "../drapes";
import { Audience, type Mood } from "./Audience";
import { Avatar } from "./Avatar";
import { Showtime } from "./Showtime";
import { Ticket, type TicketScreen } from "./Ticket";
import { WatchStory } from "./WatchStory";

type Screen =
  | { kind: "idea"; key: string; idea: IdeaSummary }
  | { kind: "detected"; key: string; item: FeedItemView }
  | { kind: "end" };

/** The index of the ticket the reader reaches when the curtains close for the interval. */
const INTERVAL_AT = 3;

/**
 * Discover: one ticket per screen, snapping as you swipe, scroll or press J / K. Recorded ideas
 * first, then the newest posts detected automatically in the authors' own feeds (marked
 * "Unreviewed"). The reader stamps tickets by really looking at, opening and watching them; the
 * audience below the stage line reacts, and after the third ticket the curtains close for an
 * interval that replays the journey. No auto-advance, no ranking by anything but time.
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
  const book = useStamps();
  const [showtime, setShowtime] = useState(false);
  const [story, setStory] = useState(false);
  const [applause, setApplause] = useState(false);
  const applauseTimer = useRef<number | undefined>(undefined);

  // The window makes room for the house below the stage line while this page is open.
  useEffect(() => {
    document.documentElement.dataset.house = "on";
    return () => {
      delete document.documentElement.dataset.house;
    };
  }, []);

  const mood: Mood = showtime ? "cheer" : applause ? "clap" : "idle";

  const stamp = useCallback((ticket: string, kind: Stamp) => {
    if (!addStamp(ticket, kind)) return;
    // Looking is quiet; opening a source or watching earns a round of applause.
    if (kind === "seen") return;
    swayDrapes();
    setApplause(true);
    window.clearTimeout(applauseTimer.current);
    applauseTimer.current = window.setTimeout(() => setApplause(false), 1800);
  }, []);

  // After the third ticket the curtains close once per visit and show the whole journey.
  useEffect(() => {
    if (active !== INTERVAL_AT) return;
    try {
      if (sessionStorage.getItem("relay:showtime") === "1") return;
      sessionStorage.setItem("relay:showtime", "1");
    } catch {
      return;
    }
    setShowtime(true);
  }, [active]);

  // The first Watch of a visit shows what watching does, with a real example.
  const onFirstWatch = useCallback(() => {
    try {
      if (sessionStorage.getItem("relay:watch-story") === "1") return;
      sessionStorage.setItem("relay:watch-story", "1");
    } catch {
      return;
    }
    setStory(true);
  }, []);
  const closeShowtime = useCallback(() => setShowtime(false), []);
  const closeStory = useCallback(() => setStory(false), []);

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
    root?.scrollTo({ top: el.offsetTop, behavior: reduce ? "auto" : "smooth" });
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
  const current = screens[Math.min(active, screens.length - 1)];
  const activeAuthor =
    current?.kind === "idea"
      ? current.idea.trader.id
      : current?.kind === "detected"
        ? current.item.trader.id
        : undefined;
  const total = totalStamps(book);
  const level = levelOf(total);

  return (
    <div
      className="stream-wrap"
      data-cursor-zone
      data-author={activeAuthor}
      data-showtime={showtime}
    >
      <Audience mood={mood} />

      <div className="stream__bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <button
        type="button"
        className="cord"
        onClick={() => setShowtime(true)}
        aria-label="Pull the cord: show how Relay works"
        title="Pull the cord"
      >
        <span className="cord__rope" />
        <span className="cord__tassel">
          <Icon name="star-filled" size={16} />
        </span>
      </button>
      <Showtime open={showtime} onClose={closeShowtime} />
      {story && <WatchStory onClose={closeStory} />}

      <h1 className="sr-only" data-page-start tabIndex={-1}>
        Discover
      </h1>

      <div className="stream__top">
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
        <p
          className="level"
          title={
            level.toNext === null
              ? "Top of the house"
              : `${level.toNext} more stamps for the next title`
          }
        >
          <Icon name="star-filled" size={12} /> {level.name} · {total}
        </p>
      </div>

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
                    to="/about"
                    className="orb"
                    aria-label="How Relay works"
                  >
                    <Icon name="details" size={26} />
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

          const ticketScreen: TicketScreen =
            s.kind === "idea"
              ? { kind: "idea", idea: s.idea }
              : { kind: "detected", item: s.item };
          const person = s.kind === "idea" ? s.idea.trader : s.item.trader;
          const title = s.kind === "idea" ? s.idea.title : s.item.title;
          return (
            <article
              key={s.key}
              className="scr"
              data-author={person.id}
              data-active={i === active}
              {...common}
              aria-label={`${title}, ${person.displayName}`}
            >
              <Ticket
                screen={ticketScreen}
                active={i === active}
                now={now}
                stamps={stampsOf(book, s.key)}
                latestSeq={latestSeqOf(person.id)}
                onStamp={(k) => {
                  stamp(s.key, k);
                  if (k === "watched") onFirstWatch();
                }}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
