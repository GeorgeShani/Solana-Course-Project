import type { EntryStatus } from "@relay/domain";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ApiContractError,
  fetchFeedPage,
  type FeedPage,
  type PlanCardView,
} from "../../lib/api";
import { useWallClock } from "../../lib/clock";
import { API_URL } from "../../lib/config";
import {
  initialOrder,
  reconcileOrder,
  showNewest as adoptNewest,
  visibleCards,
} from "../../lib/feed-order";
import type { FeedLoad } from "../../lib/feed-server";
import { fictionalPreviewFeed } from "../../lib/fixtures";
import { formatAge } from "../../lib/format";
import { creatorName, planLabel } from "../../lib/labels";
import { chainNowMs, liveEntry } from "../../lib/live-status";
import { useMounted } from "../../lib/mounted";
import { STATUS_HEADLINE } from "../../lib/status";
import { snapshotOf, toggleWatched, useWatchList } from "../../lib/watchlist";
import { Icon } from "../ui/Icon";
import { Banner, EmptyState, Finale, UnavailableState } from "./FeedStates";
import { PlanCard } from "./PlanCard";
import { ScriptSheet } from "./ScriptSheet";
import { Spotlight } from "./Spotlight";
import { WatchToast } from "./WatchToast";

const POLL_MS = 15_000;
const NO_PAGES: FeedPage[] = [];
const FINALE_ID = "__finale";
/** A chain clock this far from the wall clock (a fork, time travel) is labelled on the card. */
const SKEW_LABEL_MS = 60_000;

const STATUS_ORDER: EntryStatus[] = [
  "in_range",
  "below_range",
  "above_range",
  "price_stale",
  "price_unavailable",
  "expired",
  "closed",
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
  );
}

export function Feed({
  initial,
  preview,
  chainOk,
  initialPlan,
  onActiveChange,
}: {
  initial: FeedLoad;
  preview: boolean;
  chainOk: boolean;
  initialPlan: string | undefined;
  onActiveChange: (planPda: string) => void;
}) {
  // Without first-page data, wait until after hydration to fetch so server and client render the same.
  const mounted = useMounted();

  const query = useInfiniteQuery<
    FeedPage,
    Error,
    InfiniteData<FeedPage, string | null>,
    string[],
    string | null
  >({
    queryKey: ["feed", preview ? "fictional-preview" : "live"],
    queryFn: ({ pageParam }) =>
      preview
        ? Promise.resolve(fictionalPreviewFeed(Date.now()))
        : fetchFeedPage(API_URL, pageParam),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: initial.ok
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    initialDataUpdatedAt: initial.receivedAt,
    enabled: initial.ok || mounted,
    staleTime: preview ? Infinity : 10_000,
    refetchInterval: preview ? false : POLL_MS,
    refetchOnWindowFocus: !preview,
    retry: 1,
  });

  const pages = query.data?.pages ?? NO_PAGES;
  const [view, setView] = useState(() => initialOrder(pages));
  if (view.pages !== pages) setView(reconcileOrder(view, pages));
  const { pending } = view;

  const wall = useWallClock();
  const firstPage = pages[0];
  const nowMs = firstPage
    ? chainNowMs(firstPage.nowMs, query.dataUpdatedAt, wall)
    : 0;
  const clockSkewed =
    !preview &&
    !!firstPage &&
    Math.abs(firstPage.nowMs - query.dataUpdatedAt) > SKEW_LABEL_MS;
  const offline = query.isError && !!query.data;

  const cards = visibleCards(view);
  const liveById = new Map(cards.map((c) => [c.planPda, liveEntry(c, nowMs)]));

  const watchList = useWatchList();
  const watched = useMemo(
    () => new Set(watchList.map((w) => w.planPda)),
    [watchList],
  );

  // ------------------------------------------------------------------ active act and URL

  const [activeId, setActiveId] = useState<string | undefined>(initialPlan);
  const nodes = useRef(new Map<string, HTMLElement>());
  const observer = useRef<IntersectionObserver | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || !(e.target instanceof HTMLElement)) continue;
          const id = e.target.dataset.plan;
          if (id) setActiveId(id);
        }
      },
      { root: feedRef.current, threshold: 0.6 },
    );
    for (const el of nodes.current.values()) observer.current.observe(el);
    return () => observer.current?.disconnect();
  }, []);

  // One stable ref callback for every act, so the 1 s clock tick does not re-observe cards.
  const observeAct = useCallback((el: HTMLElement | null) => {
    const id = el?.dataset.plan;
    if (!el || !id) return;
    nodes.current.set(id, el);
    observer.current?.observe(el);
    return () => {
      observer.current?.unobserve(el);
      if (nodes.current.get(id) === el) nodes.current.delete(id);
    };
  }, []);

  useEffect(() => {
    if (activeId && activeId !== FINALE_ID) onActiveChange(activeId);
  }, [activeId, onActiveChange]);

  // Restore the reader's place from ?plan= once the cards exist.
  // Instant, before paint: a smooth scroll here gets cancelled when snap points settle.
  const restored = useRef(false);
  useLayoutEffect(() => {
    if (restored.current || !initialPlan || cards.length === 0) return;
    restored.current = true;
    const el = nodes.current.get(initialPlan);
    const feed = feedRef.current;
    if (el && feed)
      feed.scrollTo({
        top: el.offsetTop - feed.offsetTop,
        behavior: "instant",
      });
  }, [initialPlan, cards.length]);

  // ------------------------------------------------------------------ paging

  const activeIndex =
    activeId === FINALE_ID
      ? cards.length
      : cards.findIndex((c) => c.planPda === activeId);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && activeIndex >= cards.length - 3)
      void fetchNextPage();
  }, [
    activeIndex,
    cards.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // ------------------------------------------------------------------ announcements

  const [announcement, setAnnouncement] = useState("");
  const activeCard = cards.find((c) => c.planPda === activeId);
  const activeStatus = activeCard
    ? liveById.get(activeCard.planPda)?.status
    : undefined;
  const lastActive = useRef<{ id: string; status: EntryStatus } | null>(null);
  useEffect(() => {
    if (!activeCard || !activeStatus) return;
    const prev = lastActive.current;
    if (
      prev &&
      prev.id === activeCard.planPda &&
      prev.status !== activeStatus
    ) {
      setAnnouncement(
        `${creatorName(activeCard)}'s ${activeCard.pair.baseSymbol} plan: ${STATUS_HEADLINE[activeStatus].toLowerCase()}`,
      );
    }
    lastActive.current = { id: activeCard.planPda, status: activeStatus };
  }, [activeCard, activeStatus]);

  const [toast, setToast] = useState<{ key: number; subject: string } | null>(
    null,
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const onToggleWatch = (card: PlanCardView) => {
    const status = (liveById.get(card.planPda) ?? liveEntry(card, nowMs))
      .status;
    const result = toggleWatched(
      card.planPda,
      planLabel(card),
      snapshotOf(card, status),
    );
    const subject = `${creatorName(card)}'s ${card.pair.baseSymbol} plan`;
    setAnnouncement(
      result === null
        ? "Couldn't save the watch list: this browser is blocking local storage"
        : result
          ? `Watching ${subject}. Watching doesn't place a trade.`
          : `Stopped watching ${subject}`,
    );
    setToast((prev) =>
      result ? { key: (prev?.key ?? 0) + 1, subject } : null,
    );
  };

  // ------------------------------------------------------------------ script sheet

  const [scriptId, setScriptId] = useState<string | null>(null);
  const scriptCard = scriptId
    ? (cards.find((c) => c.planPda === scriptId) ?? null)
    : null;

  // ------------------------------------------------------------------ keyboard

  const goTo = useCallback((id: string) => {
    const el = nodes.current.get(id);
    if (!el) return;
    el.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    el.focus({ preventScroll: true });
  }, []);

  const ids = [...cards.map((c) => c.planPda), FINALE_ID];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
    const holder =
      e.target instanceof HTMLElement
        ? e.target.closest<HTMLElement>("[data-plan]")
        : null;
    const currentId = holder?.dataset.plan ?? activeId ?? ids[0];
    const i = Math.max(0, ids.indexOf(currentId));
    const key = e.key;
    if (key === "j" || key === "ArrowDown" || key === "PageDown") {
      e.preventDefault();
      goTo(ids[Math.min(ids.length - 1, i + 1)]);
    } else if (key === "k" || key === "ArrowUp" || key === "PageUp") {
      e.preventDefault();
      goTo(ids[Math.max(0, i - 1)]);
    } else if ((key === "w" || key === "d") && currentId !== FINALE_ID) {
      const card = cards.find((c) => c.planPda === currentId);
      if (card) {
        e.preventDefault();
        if (key === "w") onToggleWatch(card);
        else setScriptId(card.planPda);
      }
    }
  };

  const showNewest = () => {
    setView(adoptNewest);
    feedRef.current?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  // ------------------------------------------------------------------ render

  if (!query.data) {
    if (!initial.ok && initial.kind === "contract" && !query.isFetching) {
      return (
        <UnavailableState
          kind="contract"
          message={initial.message}
          checking={false}
          onRetry={() => void query.refetch()}
        />
      );
    }
    const message = query.error?.message ?? (initial.ok ? "" : initial.message);
    return (
      <UnavailableState
        kind={
          query.error instanceof ApiContractError ? "contract" : "unavailable"
        }
        message={message}
        checking={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
      />
    );
  }

  const tally = STATUS_ORDER.map((s): [string, number] => [
    STATUS_HEADLINE[s],
    cards.filter((c) => liveById.get(c.planPda)?.status === s).length,
  ]).filter(([, n]) => n > 0);
  const cast = [
    ...new Map(
      cards.map((c) => [
        c.creator.address,
        { seed: c.creator.address, name: creatorName(c) },
      ]),
    ).values(),
  ];

  return (
    <div className="feed-wrap" data-cursor-zone>
      <Spotlight
        index={Math.max(0, activeIndex)}
        lit={activeId !== FINALE_ID}
      />
      <div className="feed-banners">
        {preview && (
          <Banner tone="preview">
            <strong>Fictional preview — not live data.</strong> Invented
            creators, prices and plans; nothing here is onchain.{" "}
            <Link to="/">Leave preview</Link>
          </Banner>
        )}
        {offline && (
          <Banner tone="warn">
            <strong>Can't reach Relay right now.</strong> Showing plans from{" "}
            {formatAge(
              Math.max(0, (wall ?? query.dataUpdatedAt) - query.dataUpdatedAt),
            )}
            ; statuses may be out of date.
          </Banner>
        )}
        {!preview && !chainOk && (
          <Banner tone="warn">
            <strong>Can't reach Solana right now.</strong> Statuses may be out
            of date.
          </Banner>
        )}
        {pending.length > 0 && (
          <button type="button" className="pill" onClick={showNewest}>
            <Icon name="arrow-up" size={16} />
            New plans ({pending.length})
          </button>
        )}
      </div>

      <div
        ref={feedRef}
        className="feed"
        role="feed"
        aria-label="Trade plans"
        aria-busy={query.isFetchingNextPage}
        onKeyDown={onKeyDown}
      >
        {cards.map((card, i) => (
          <PlanCard
            key={card.planPda}
            card={card}
            live={liveById.get(card.planPda) ?? liveEntry(card, nowMs)}
            nowMs={nowMs}
            clockSkewed={clockSkewed}
            index={i}
            total={query.hasNextPage ? -1 : cards.length}
            active={card.planPda === (activeId ?? cards[0].planPda)}
            offline={offline}
            watching={watched.has(card.planPda)}
            onToggleWatch={() => onToggleWatch(card)}
            onOpenScript={() => setScriptId(card.planPda)}
            articleRef={observeAct}
          />
        ))}
        <Finale
          sectionRef={observeAct}
          active={activeId === FINALE_ID}
          cast={cast}
          tally={tally}
          total={cards.length}
          watched={cards
            .filter((c) => watched.has(c.planPda))
            .map((c) => ({
              planPda: c.planPda,
              label: planLabel(c),
              seed: c.creator.address,
            }))}
          hasMore={!!query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          refreshing={query.isFetching}
          onRefresh={() => {
            void query.refetch().then(showNewest);
          }}
          onReplay={() => cards[0] && goTo(cards[0].planPda)}
          onGoTo={goTo}
        />
      </div>

      <ScriptSheet
        card={scriptCard}
        live={scriptCard ? (liveById.get(scriptCard.planPda) ?? null) : null}
        nowMs={nowMs}
        onClose={() => setScriptId(null)}
      />

      <WatchToast toast={toast} onDismiss={dismissToast} />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <p className="feed-keys" aria-hidden="true">
        <kbd>J</kbd>/<kbd>K</kbd> or <kbd>↑</kbd>/<kbd>↓</kbd> move ·{" "}
        <kbd>W</kbd> watch · <kbd>D</kbd> plan
      </p>
    </div>
  );
}
