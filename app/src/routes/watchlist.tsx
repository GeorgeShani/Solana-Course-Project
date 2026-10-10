import { formatUnits } from "@relay/domain";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Cue } from "../components/cue/Cue";
import { Avatar } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import { PairIcon } from "../components/ui/TokenIcon";
import {
  fetchExecutions,
  fetchPlan,
  type ExecutionView,
  type PlanCardView,
} from "../lib/api";
import { useWallClock } from "../lib/clock";
import { API_URL } from "../lib/config";
import { formatClock, formatUsd, shortAddress } from "../lib/format";
import { planLabel } from "../lib/labels";
import { liveEntry } from "../lib/live-status";
import { useMounted } from "../lib/mounted";
import {
  estimateOpen,
  isAddress,
  plausibleBlockTime,
  watchChanges,
} from "../lib/my-plans";
import { STATUS_HEADLINE, STATUS_TONE } from "../lib/status";
import {
  removeWatchedTrader,
  useWatchedTraders,
  type WatchedTrader,
} from "../lib/trader-watch";
import { traderName, useTraderIndex } from "../lib/traders";
import { useWallet } from "../lib/wallet";
import {
  removeWatched,
  useWatchList,
  type WatchedPlan,
} from "../lib/watchlist";

const TABS = ["traders", "records", "history"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  traders: "Traders",
  records: "Records",
  history: "History",
};

function isTab(v: unknown): v is Tab {
  return TABS.some((t) => t === v);
}

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist · Relay" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: isTab(search.tab) ? search.tab : undefined,
  }),
  component: Watchlist,
});

const FOLLOWER_KEY = "relay:follower";

const when = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function usePlan(planPda: string) {
  return useQuery({
    queryKey: ["plan", planPda],
    queryFn: () => fetchPlan(API_URL, planPda),
    staleTime: 15_000,
    retry: 1,
  });
}

/** The plan's status now, on the server's clock carried forward by the time since the response. */
function useLive(card: PlanCardView | undefined, receivedAt: number) {
  const wall = useWallClock();
  if (!card) return null;
  const nowMs = card.nowMs + Math.max(0, (wall ?? receivedAt) - receivedAt);
  return { entry: liveEntry(card, nowMs), nowMs };
}

function Watchlist() {
  const mounted = useMounted();
  const watching = useWatchList();
  const traders = useWatchedTraders();
  const navigate = useNavigate({ from: "/watchlist" });
  const tab = Route.useSearch().tab ?? "traders";
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const select = (t: Tab, focus = false) => {
    void navigate({ search: { tab: t }, replace: true });
    if (focus) tabRefs.current[t]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const next =
      e.key === "ArrowRight"
        ? TABS[(i + 1) % TABS.length]
        : e.key === "ArrowLeft"
          ? TABS[(i + TABS.length - 1) % TABS.length]
          : e.key === "Home"
            ? TABS[0]
            : e.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    select(next, true);
  };

  const count: Record<Tab, number | null> = {
    traders: mounted ? traders.length : null,
    records: mounted ? watching.length : null,
    history: null,
  };

  return (
    <section
      className="page page--wide"
      aria-labelledby="watchlist-title"
      data-cursor-zone
    >
      <header className="page__head">
        <h1 id="watchlist-title" className="page__title">
          Watchlist
        </h1>
        <span className="storage-note">
          <Icon name="shield" size={13} />
          Stored in this browser only
        </span>
      </header>

      <div className="wl-tabs">
        <div
          className="tabs"
          role="tablist"
          aria-label="Watchlist"
          onKeyDown={onKey}
        >
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              type="button"
              role="tab"
              id={`wl-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`wl-panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              className="tabs__tab"
              onClick={() => select(t)}
            >
              {TAB_LABEL[t]}
              {count[t] !== null && count[t] > 0 && (
                <span className="tabs__count">{count[t]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`wl-panel-${tab}`}
        aria-labelledby={`wl-tab-${tab}`}
        className="wl-panel"
      >
        {!mounted ? (
          <p className="page__text" aria-busy="true">
            Reading your watchlist…
          </p>
        ) : tab === "traders" ? (
          traders.length === 0 ? (
            <Empty>Watch a trader to see their new plans here.</Empty>
          ) : (
            <WatchedTraders list={traders} />
          )
        ) : tab === "records" ? (
          watching.length === 0 ? (
            <Empty>Watch a plan to see what changes after you save it.</Empty>
          ) : (
            <ul className="wl-list">
              {watching.map((w) => (
                <WatchedRow key={w.planPda} w={w} />
              ))}
            </ul>
          )
        ) : (
          <Followed />
        )}
      </div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="wl-empty">
      <Cue pose="saved" className="wl-empty__cue" />
      <p className="wl-empty__line">{children}</p>
      <Link to="/traders" className="btn btn--primary btn--large">
        Explore traders
      </Link>
    </div>
  );
}

function WatchedTraders({ list }: { list: readonly WatchedTrader[] }) {
  const q = useTraderIndex();
  return (
    <ul className="wl-list">
      {list.map((w) => {
        const t = q.data?.traders.find((x) => x.address === w.address);
        const fresh = t
          ? t.plans.filter(
              (p) =>
                w.seenPublishedAt === null ||
                p.version.publishedAt > w.seenPublishedAt,
            ).length
          : 0;
        const latest = t?.plans[0];
        return (
          <li key={w.address} className="wl-card lift">
            <Avatar seed={w.address} size={48} />
            <div className="wl-card__body">
              <p className="wl-card__title">
                {t ? traderName(t) : w.label}
                {t?.isDemo && <span className="badge">Demo creator</span>}
              </p>
              <p className="wl-card__meta">
                <span className="num">{shortAddress(w.address)}</span>
                {w.savedAt > 0 && <> · watching since {when(w.savedAt)}</>}
              </p>
              {q.isPending ? (
                <p className="wl-card__meta" aria-busy="true">
                  Checking for new plans…
                </p>
              ) : q.isError ? (
                <p className="watchlist__error" role="status">
                  Couldn't check for new plans.{" "}
                  <button type="button" onClick={() => void q.refetch()}>
                    Try again
                  </button>
                </p>
              ) : !t ? (
                <p className="wl-card__meta">
                  No plans from this wallet in the feed now.
                </p>
              ) : (
                <p className="wl-card__now">
                  {fresh > 0 ? (
                    <span className="watchlist__status" data-tone="new">
                      {fresh} new since you watched
                    </span>
                  ) : (
                    <span className="wl-card__meta">Nothing new</span>
                  )}
                  {latest && (
                    <span className="wl-card__meta">
                      Latest: {latest.pair.label} ·{" "}
                      {formatClock(latest.version.publishedAt)}
                    </span>
                  )}
                </p>
              )}
              <p className="wl-card__source">
                <KindBadge kind="relay_plan" />
                <span className="wl-card__meta">
                  Source: plans this wallet signed
                </span>
              </p>
            </div>
            <div className="wl-card__actions">
              <Link
                to="/traders/$address"
                params={{ address: w.address }}
                className="btn btn--glass btn--small"
              >
                Open
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => removeWatchedTrader(w.address)}
                aria-label={`Stop watching ${w.label}`}
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function WatchedRow({ w }: { w: WatchedPlan }) {
  const q = usePlan(w.planPda);
  const card = q.data?.card;
  const live = useLive(card, q.dataUpdatedAt);
  const status = live?.entry.status;
  const changes =
    card && status && w.snapshot
      ? watchChanges(w.snapshot, card, status)
      : null;
  const missed = status === "above_range";

  return (
    <li className="wl-card lift">
      {card ? (
        <PairIcon
          base={card.pair.baseSymbol}
          quote={card.pair.quoteSymbol}
          size={36}
        />
      ) : (
        <span className="wl-card__star">
          <Icon name="star-filled" size={22} />
        </span>
      )}
      <div className="wl-card__body">
        <p className="wl-card__title">{card ? planLabel(card) : w.label}</p>
        <p className="wl-card__meta">
          {w.savedAt > 0 && <>Watching since {when(w.savedAt)}</>}
          {q.data && <> · checked {when(q.dataUpdatedAt)}</>}
        </p>
        {q.isPending ? (
          <p className="wl-card__meta" aria-busy="true">
            Checking the plan now…
          </p>
        ) : q.isError ? (
          <p className="watchlist__error" role="status">
            Couldn't load this plan. {q.error.message}.{" "}
            <button type="button" onClick={() => void q.refetch()}>
              Try again
            </button>
          </p>
        ) : (
          status && (
            <>
              <p className="wl-card__now">
                <span
                  className="watchlist__status"
                  data-tone={STATUS_TONE[status]}
                >
                  {STATUS_HEADLINE[status]}
                </span>
                {!w.snapshot ? (
                  <span className="wl-card__meta">
                    Saved before snapshots, so only today's status
                  </span>
                ) : changes && changes.length === 0 ? (
                  <span className="wl-card__meta">No change since saved</span>
                ) : null}
              </p>
              {changes && changes.length > 0 && (
                <dl
                  className="changes"
                  aria-label={`Changes since you watched ${w.label}`}
                >
                  {changes.map((c) => (
                    <div key={c.what} data-what={c.what}>
                      <dt>
                        {c.what === "status"
                          ? "Status"
                          : c.what === "version"
                            ? "Plan version"
                            : "Price"}
                      </dt>
                      <dd>
                        <span className="num">{c.then}</span>
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only"> then, now </span>
                        <span className="num changes__now">{c.now}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {missed && (
                <p className="wl-card__missed">
                  <Cue pose="missed" className="wl-card__cue" />
                  Price moved above the range. Watching saved the plan; it
                  didn't trade.
                </p>
              )}
            </>
          )
        )}
        <p className="wl-card__source">
          <KindBadge kind="relay_plan" />
        </p>
      </div>
      <div className="wl-card__actions">
        <Link
          to="/records/$planPda"
          params={{ planPda: w.planPda }}
          className="btn btn--glass btn--small"
        >
          Open
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => removeWatched(w.planPda)}
          aria-label={`Stop watching ${w.label}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function readFollower(): string {
  try {
    return localStorage.getItem(FOLLOWER_KEY) ?? "";
  } catch {
    return "";
  }
}

function Followed() {
  const mounted = useMounted();
  const { state: wallet } = useWallet();
  const connected =
    wallet.status === "connected" ? wallet.account.address : null;
  const [address, setAddress] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const saved = address ?? (mounted ? readFollower() || (connected ?? "") : "");
  const value = draft ?? saved;

  const q = useQuery({
    queryKey: ["executions", saved],
    queryFn: () => fetchExecutions(API_URL, saved),
    enabled: mounted && isAddress(saved),
    staleTime: 15_000,
    retry: 1,
  });

  const lookUp = (next: string) => {
    if (!isAddress(next)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setAddress(next);
    setDraft(null);
    try {
      localStorage.setItem(FOLLOWER_KEY, next);
    } catch {
      // Storage blocked: the lookup still works for this visit.
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    lookUp(value.trim());
  };

  const recorded = q.data?.filter((x) => x.status === "recorded") ?? [];
  const failed = q.data?.filter((x) => x.status === "failed") ?? [];

  return (
    <div className="wl-history" data-cursor="native">
      <form className="wl-lookup" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="follower" className="field__label">
            Wallet address
          </label>
          <div className="wl-lookup__row">
            <input
              id="follower"
              className="field__input num"
              value={value}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              inputMode="text"
              aria-invalid={invalid}
              aria-describedby="follower-msg"
              placeholder="Solana address"
            />
            <button type="submit" className="btn btn--glass btn--large">
              Look up
            </button>
          </div>
          {invalid ? (
            <p id="follower-msg" className="field__error" role="alert">
              That isn't a Solana address: 32–44 letters and digits.
            </p>
          ) : (
            <p id="follower-msg" className="field__hint">
              Reads public receipts only. Relay never controls this wallet.
              {connected && connected !== saved && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => lookUp(connected)}
                  >
                    Use connected wallet
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </form>

      {isAddress(saved) &&
        (q.isPending ? (
          <p className="page__text" aria-busy="true">
            Looking up verified follows…
          </p>
        ) : q.isError ? (
          <div className="watchlist__error" role="status">
            Couldn't load follows. {q.error.message}.{" "}
            <button type="button" onClick={() => void q.refetch()}>
              Try again
            </button>
          </div>
        ) : q.data.length === 0 ? (
          <p className="page__text">
            No follows recorded for{" "}
            <span className="num">{shortAddress(saved)}</span> yet.
          </p>
        ) : (
          <>
            <h2 className="page__subsection">Verified entries</h2>
            {recorded.length === 0 ? (
              <p className="page__text">None yet.</p>
            ) : (
              <ul className="receipts">
                {recorded.map((x) => (
                  <ReceiptRow key={x.signature} x={x} />
                ))}
              </ul>
            )}

            <h2 className="page__subsection">Closed outcomes</h2>
            <p className="page__text">
              None verified: exiting through Relay isn't available yet. Open
              positions show estimates only.
            </p>

            {failed.length > 0 && (
              <>
                <h2 className="page__subsection">Failed attempts</h2>
                <ul className="receipts">
                  {failed.map((x) => (
                    <FailedRow key={x.signature} x={x} />
                  ))}
                </ul>
              </>
            )}
          </>
        ))}
    </div>
  );
}

function TxMeta({ x }: { x: ExecutionView }) {
  const t = plausibleBlockTime(x.blockTime);
  return (
    <p className="receipt__meta">
      Slot <span className="num">{x.slot}</span>
      {t !== null && <> · {formatClock(t)}</>} · version {x.version} · tx{" "}
      <span className="num" title={x.signature}>
        {shortAddress(x.signature)}
      </span>
    </p>
  );
}

function ReceiptRow({ x }: { x: ExecutionView }) {
  const q = usePlan(x.planPda);
  const card = q.data?.card;
  const quoteSpent = x.quoteSpent === null ? null : BigInt(x.quoteSpent);
  const baseReceived = x.baseReceived === null ? null : BigInt(x.baseReceived);
  const price = card?.entry.price ? BigInt(card.entry.price.units) : null;
  const est =
    card && quoteSpent !== null && baseReceived !== null && price !== null
      ? estimateOpen(baseReceived, quoteSpent, price, card.pair.baseDecimals)
      : null;

  return (
    <li className="receipt">
      <p className="receipt__head">
        <span className="receipt__badge">
          <Icon name="chain" size={15} />
          Verified receipt
        </span>
        <span className="receipt__plan">
          {card ? planLabel(card) : shortAddress(x.planPda)}
        </span>
      </p>
      {card && quoteSpent !== null && baseReceived !== null ? (
        <dl className="receipt__facts">
          <div>
            <dt>Spent</dt>
            <dd className="num">
              {formatUsd(quoteSpent, card.pair.quoteDecimals)}
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd className="num">
              {formatUnits(baseReceived, card.pair.baseDecimals)}{" "}
              {card.pair.baseSymbol}
            </dd>
          </div>
          {x.effectivePrice !== null && (
            <div>
              <dt>Entry price</dt>
              <dd className="num">
                {formatUsd(BigInt(x.effectivePrice), card.pair.quoteDecimals)}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        q.isError && (
          <p className="watchlist__meta">Plan details unavailable right now.</p>
        )
      )}
      {x.receiptPda && (
        <p className="receipt__meta">
          Receipt{" "}
          <span className="num" title={x.receiptPda}>
            {shortAddress(x.receiptPda)}
          </span>
        </p>
      )}
      <TxMeta x={x} />
      {card && (
        <div className="receipt__estimate">
          <p className="receipt__estimate-head">
            Open position · estimate, not a verified result
          </p>
          {est ? (
            <p>
              Worth about{" "}
              <span className="num">
                {formatUsd(est.value, card.pair.quoteDecimals)}
              </span>{" "}
              at the current reference price (
              <span className="num">
                {est.change >= 0n ? "+" : "−"}
                {formatUsd(
                  est.change >= 0n ? est.change : -est.change,
                  card.pair.quoteDecimals,
                )}
              </span>
              ). Selling fees and slippage are not included.
            </p>
          ) : (
            <p>No current price, so no estimate.</p>
          )}
        </div>
      )}
    </li>
  );
}

function FailedRow({ x }: { x: ExecutionView }) {
  const q = usePlan(x.planPda);
  return (
    <li className="receipt" data-status="failed">
      <p className="receipt__head">
        <span className="receipt__badge" data-status="failed">
          <Icon name="alert" size={15} />
          Failed · no trade
        </span>
        <span className="receipt__plan">
          {q.data ? planLabel(q.data.card) : shortAddress(x.planPda)}
        </span>
      </p>
      <p className="page__text">
        {x.errorMessage ?? "The transaction failed onchain."}
        {x.errorName && (
          <span className="watchlist__meta"> ({x.errorName})</span>
        )}
      </p>
      <TxMeta x={x} />
    </li>
  );
}
