import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import {
  sameSource,
  type FeedItemView,
  type IdeaSummary,
  type TraderSummary,
} from "../model";
import { addStamp, stampsOf, useStamps, type Stamp } from "../stamps";
import { Audience } from "../../../components/theatre/Audience";
import { useTheatreHouse } from "../../../components/theatre/useTheatreHouse";
import { useFeedEnding } from "../../../components/theatre/useFeedEnding";
import { Avatar } from "./Avatar";
import { Showtime } from "./Showtime";
import { Ticket, type TicketScreen } from "./Ticket";
import { WatchStory } from "./WatchStory";

type Screen =
  | { kind: "idea"; key: string; idea: IdeaSummary }
  | { kind: "detected"; key: string; item: FeedItemView };

/** Cap the stream so a visit stays short; recorded ideas first, then detected posts. */
const MAX_EXAMPLES = 6;

/**
 * Discover: one idea per screen, browsed with the previous and next buttons, a swipe, the wheel or
 * J / K. Recorded ideas first, then the newest posts detected automatically in the authors' own
 * feeds (marked "not reviewed"). A card is marked seen once it has been looked at for a moment; the
 * audience below the stage line applauds when a source is opened or something is watched. The
 * curtains close when the reader swipes past the last card. No auto-advance, no ranking by
 * anything but time.
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

  const screens = useMemo<Screen[]>(() => {
    const cards: Screen[] = [
      ...ideas.map((idea): Screen => ({ kind: "idea", key: idea.id, idea })),
      ...extra.map((item): Screen => ({
        kind: "detected",
        key: `d${item.id}`,
        item,
      })),
    ].slice(0, MAX_EXAMPLES);
    return cards;
  }, [ideas, extra]);
  const total = screens.length;

  const feedRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Where the reader is heading, so quick key presses keep moving instead of waiting for the scroll.
  const heading = useRef(0);
  const book = useStamps();
  const [showtime, setShowtime] = useState(false);
  const [story, setStory] = useState(false);
  const { mood, applaud } = useTheatreHouse(showtime);
  const endedShow = useRef(false);
  const finish = useCallback(() => {
    endedShow.current = true;
    setStory(false);
    setShowtime(true);
  }, []);
  useFeedEnding(feedRef, total > 0 && !showtime && !story, finish);

  const stamp = useCallback(
    (ticket: string, kind: Stamp) => {
      if (!addStamp(ticket, kind)) return;
      // Looking is quiet; opening a source or watching earns a round of applause.
      if (kind === "seen") return;
      applaud();
    },
    [applaud],
  );

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

  const go = useCallback(
    (to: number, behavior?: ScrollBehavior) => {
      if (to >= total && total > 0) {
        finish();
        return;
      }
      const root = feedRef.current;
      const el = root?.querySelector<HTMLElement>(`[data-index="${to}"]`);
      if (!el) return;
      heading.current = to;
      setActive(to);
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // Scroll the feed itself, never the page around it.
      root?.scrollTo({
        top: el.offsetTop,
        behavior: behavior ?? (reduce ? "auto" : "smooth"),
      });
      window.requestAnimationFrame(() => el.focus({ preventScroll: true }));
    },
    [finish, total],
  );

  // Choosing a different author starts again from that author's first card, not from wherever the
  // scroll position happened to be.
  useEffect(() => {
    heading.current = 0;
    setActive(0);
    feedRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [trader]);

  // After the end of the show the curtains open back at the first card.
  const closeShowtime = useCallback(() => {
    if (endedShow.current) {
      endedShow.current = false;
      go(0, "auto");
    } else {
      go(active, "auto");
    }
    setShowtime(false);
  }, [go, active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showtime || story) return;
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
      if (next === null || next < 0 || next > screens.length) return;
      e.preventDefault();
      go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, screens.length, showtime, story]);

  const latestSeqOf = (traderId: string) =>
    people.find((p) => p.id === traderId)?.latestSeq ?? null;
  const current = screens[Math.min(active, screens.length - 1)];
  const activeAuthor =
    current?.kind === "idea"
      ? current.idea.trader.id
      : current?.kind === "detected"
        ? current.item.trader.id
        : undefined;
  return (
    <div
      className="stream-wrap"
      data-cursor-zone
      data-author={activeAuthor}
      data-showtime={showtime}
    >
      <Audience mood={mood} />

      <Showtime open={showtime} onClose={closeShowtime} />
      {story && <WatchStory onClose={closeStory} />}

      <h1 className="sr-only" data-page-start tabIndex={-1}>
        Discover
      </h1>

      <div className="stream__toolbar" inert={showtime}>
        {people.length > 1 && (
          <nav className="authors" aria-label="Show ideas by">
            <Link
              to="/"
              search={{}}
              className="authors__pill"
              activeOptions={{ exact: true, includeSearch: true }}
            >
              Everyone
            </Link>
            {people.map((p) => (
              <Link
                key={p.id}
                to="/"
                search={{ trader: p.id }}
                className="authors__pill"
                activeOptions={{ exact: true, includeSearch: true }}
              >
                <Avatar id={p.id} name={p.displayName} />
                {p.displayName}
              </Link>
            ))}
          </nav>
        )}
        <div className="stream__tools">
          <Link to="/about" className="howto">
            <Icon name="star" size={16} />
            How it works
          </Link>
          <div className="pager" role="group" aria-label="Browse ideas">
            <button
              type="button"
              className="pager__btn"
              onClick={() => go(active - 1)}
              disabled={active <= 0}
              aria-label="Previous idea"
            >
              <Icon name="arrow-up" size={18} />
            </button>
            <span className="pager__count" aria-live="polite">
              {total === 0 ? "–" : `${Math.min(active + 1, total)} of ${total}`}
            </span>
            <button
              type="button"
              className="pager__btn"
              onClick={() => go(active + 1)}
              disabled={total === 0}
              aria-label={
                active >= total - 1 && total > 0
                  ? "Finish: close the curtains"
                  : "Next idea"
              }
            >
              <Icon name="arrow-down" size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={feedRef}
        className="stream"
        role="feed"
        aria-label={
          feedError
            ? "Public trading ideas. Live feed unavailable."
            : "Public trading ideas"
        }
        aria-busy={loading}
        inert={showtime}
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
