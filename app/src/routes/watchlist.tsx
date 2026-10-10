import { formatUnits } from "@relay/domain";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Cue } from "../components/cue/Cue";
import { Avatar } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
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
import {
  removeWatched,
  useWatchList,
  type WatchedPlan,
} from "../lib/watchlist";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist · Relay" }] }),
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
  const empty = watching.length === 0 && traders.length === 0;
  return (
    <section className="page" aria-labelledby="watchlist-title">
      <h1 id="watchlist-title" className="page__title">
        Watchlist
      </h1>
      <p className="page__text page__text--quiet">
        Saved in this browser only. No wallet or account needed. Watching never
        trades.
      </p>

      {!mounted ? (
        <p className="page__text" aria-busy="true">
          Reading your watchlist…
        </p>
      ) : empty ? (
        <div className="me-empty">
          <Cue pose="discover" className="me-empty__cue" />
          <div>
            <p className="page__text">
              Nothing watched yet. Tap <strong>Watch</strong> on a trader or a
              record to keep it here and see what changes.
            </p>
            <p className="me-empty__links">
              <Link to="/">Discover</Link>
              <Link to="/traders">Browse traders</Link>
              <Link to="/demo">Try the demo</Link>
            </p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="page__section">Traders</h2>
          {traders.length === 0 ? (
            <p className="page__text">
              No traders watched. Open a <Link to="/traders">trader</Link> and
              tap <strong>Watch trader</strong>.
            </p>
          ) : (
            <WatchedTraders list={traders} />
          )}

          <h2 className="page__section">Records</h2>
          {watching.length === 0 ? (
            <p className="page__text">
              No records watched. Tap <strong>Watch</strong> on a plan in{" "}
              <Link to="/">Discover</Link>.
            </p>
          ) : (
            <ul className="watchlist">
              {watching.map((w) => (
                <WatchedRow key={w.planPda} w={w} />
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className="page__section">Followed</h2>
      <Followed />
    </section>
  );
}

function WatchedTraders({ list }: { list: readonly WatchedTrader[] }) {
  const q = useTraderIndex();
  return (
    <ul className="watchlist">
      {list.map((w) => {
        const t = q.data?.traders.find((x) => x.address === w.address);
        const fresh = t
          ? t.plans.filter(
              (p) =>
                w.seenPublishedAt === null ||
                p.version.publishedAt > w.seenPublishedAt,
            ).length
          : 0;
        return (
          <li key={w.address} className="watchlist__item watchlist__item--rich">
            <Avatar seed={w.address} size={36} />
            <div className="watchlist__text">
              <p className="watchlist__label">{t ? traderName(t) : w.label}</p>
              {w.savedAt > 0 && (
                <p className="watchlist__meta">
                  Watching since {when(w.savedAt)}
                </p>
              )}
              {q.isPending ? (
                <p className="watchlist__meta" aria-busy="true">
                  Checking for new records…
                </p>
              ) : q.isError ? (
                <p className="watchlist__error" role="status">
                  Couldn't check for new records right now.{" "}
                  <button type="button" onClick={() => void q.refetch()}>
                    Try again
                  </button>
                </p>
              ) : !t ? (
                <p className="watchlist__meta">
                  No records from this wallet in the feed now.
                </p>
              ) : (
                <p className="watchlist__now">
                  {fresh > 0 ? (
                    <span className="watchlist__status" data-tone="new">
                      {fresh} new {fresh === 1 ? "plan" : "plans"} since you
                      watched
                    </span>
                  ) : (
                    <span className="watchlist__meta">
                      No new records since you watched.
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="watchlist__actions">
              <Link
                to="/traders/$address"
                params={{ address: w.address }}
                className="btn btn--ghost btn--small"
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
  const live = useLive(q.data?.card, q.dataUpdatedAt);
  const status = live?.entry.status;
  const changes =
    q.data && status && w.snapshot
      ? watchChanges(w.snapshot, q.data.card, status)
      : null;
  const missed = status === "above_range";

  return (
    <li className="watchlist__item watchlist__item--rich">
      {missed ? (
        <Cue pose="missed" className="watchlist__cue" />
      ) : (
        <Icon name="star-filled" className="watchlist__star" />
      )}
      <div className="watchlist__text">
        <p className="watchlist__label">
          {q.data ? planLabel(q.data.card) : w.label}
        </p>
        {w.savedAt > 0 && (
          <p className="watchlist__meta">Watching since {when(w.savedAt)}</p>
        )}
        {q.isPending ? (
          <p className="watchlist__meta" aria-busy="true">
            Checking the plan now…
          </p>
        ) : q.isError ? (
          <p className="watchlist__error" role="status">
            Couldn't load this plan right now. {q.error.message}.{" "}
            <button type="button" onClick={() => void q.refetch()}>
              Try again
            </button>
          </p>
        ) : (
          status && (
            <>
              <p className="watchlist__now">
                <span
                  className="watchlist__status"
                  data-tone={STATUS_TONE[status]}
                >
                  {STATUS_HEADLINE[status]}
                </span>
                <span className="watchlist__meta">
                  checked {when(q.dataUpdatedAt)}
                </span>
              </p>
              {!w.snapshot ? (
                <p className="watchlist__meta">
                  Watched before Relay kept a snapshot, so only the current
                  status is shown.
                </p>
              ) : changes && changes.length > 0 ? (
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
              ) : (
                <p className="watchlist__meta">No change since you watched.</p>
              )}
              {missed && (
                <p className="watchlist__note">
                  The price moved above the plan's original range. Watching
                  saved the plan; it did not place a trade.
                </p>
              )}
            </>
          )
        )}
      </div>
      <div className="watchlist__actions">
        <Link
          to="/records/$planPda"
          params={{ planPda: w.planPda }}
          className="btn btn--ghost btn--small"
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
  const [address, setAddress] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const saved = address ?? (mounted ? readFollower() : "");
  const value = draft ?? saved;

  const q = useQuery({
    queryKey: ["executions", saved],
    queryFn: () => fetchExecutions(API_URL, saved),
    enabled: mounted && isAddress(saved),
    staleTime: 15_000,
    retry: 1,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = value.trim();
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

  const recorded = q.data?.filter((x) => x.status === "recorded") ?? [];
  const failed = q.data?.filter((x) => x.status === "failed") ?? [];

  return (
    <>
      <p className="page__text">
        Trades are approved in your own wallet, and Relay records each verified
        receipt. Look up a wallet to see its verified follows. This reads public
        onchain records; Relay doesn't connect to or control the wallet.
      </p>
      <form className="lookup" onSubmit={submit} noValidate>
        <label htmlFor="follower" className="lookup__label">
          Wallet address
        </label>
        <div className="lookup__row">
          <input
            id="follower"
            className="lookup__input num"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            inputMode="text"
            aria-invalid={invalid}
            aria-describedby={invalid ? "follower-error" : undefined}
            placeholder="Solana address"
          />
          <button type="submit" className="btn btn--glass">
            Look up
          </button>
        </div>
        {invalid && (
          <p id="follower-error" className="lookup__error" role="alert">
            That isn't a Solana address. It should be 32–44 letters and digits.
          </p>
        )}
      </form>

      {isAddress(saved) &&
        (q.isPending ? (
          <p className="page__text" aria-busy="true">
            Looking up verified follows…
          </p>
        ) : q.isError ? (
          <div className="watchlist__error" role="status">
            Couldn't load follows right now. {q.error.message}.{" "}
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
            <h3 className="page__subsection">Verified entries</h3>
            {recorded.length === 0 ? (
              <p className="page__text">None yet.</p>
            ) : (
              <ul className="receipts">
                {recorded.map((x) => (
                  <ReceiptRow key={x.signature} x={x} />
                ))}
              </ul>
            )}

            <h3 className="page__subsection">Verified closed outcomes</h3>
            <p className="page__text">
              None yet. Exiting through Relay isn't available, so no closed
              result can be verified. Open positions above show estimates only.
            </p>

            {failed.length > 0 && (
              <>
                <h3 className="page__subsection">Failed attempts</h3>
                <ul className="receipts">
                  {failed.map((x) => (
                    <FailedRow key={x.signature} x={x} />
                  ))}
                </ul>
              </>
            )}
          </>
        ))}
    </>
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
