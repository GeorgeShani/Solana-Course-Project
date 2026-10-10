import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cue } from "../components/cue/Cue";
import { StatusBlock } from "../components/feed/StatusBlock";
import { WatchToast } from "../components/feed/WatchToast";
import { TradePanel } from "../components/trade/TradePanel";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import { PairIcon } from "../components/ui/TokenIcon";
import {
  ApiUnavailableError,
  fetchPlan,
  type PlanCardView,
  type VersionView,
} from "../lib/api";
import { useWallClock } from "../lib/clock";
import { API_URL, CLUSTER_LABEL } from "../lib/config";
import { formatDuration, formatUsdText } from "../lib/format";
import { creatorName, planLabel } from "../lib/labels";
import { chainNowMs, liveEntry } from "../lib/live-status";
import { explorerAccountUrl, formatTimestamp } from "../lib/sources";
import { snapshotOf, toggleWatched, useWatchList } from "../lib/watchlist";

export const Route = createFileRoute("/records/$planPda")({
  head: () => ({ meta: [{ title: "Record · Relay" }] }),
  component: RecordPage,
});

function RecordPage() {
  const { planPda } = Route.useParams();
  const q = useQuery({
    queryKey: ["plan", planPda],
    queryFn: () => fetchPlan(API_URL, planPda),
    staleTime: 15_000,
    retry: 1,
  });

  return (
    <section className="page page--wide" aria-labelledby="record-title">
      <BackLink fallback="/" label="Discover" />
      {q.isPending ? (
        <div className="skeleton-block" aria-busy="true">
          <h1 id="record-title" className="page__title">
            Record
          </h1>
          <p className="page__text">Reading the record and its evidence…</p>
        </div>
      ) : q.isError ? (
        <div className="notice notice--error" role="status">
          <Cue pose="unavailable" className="notice__cue" />
          <div className="notice__body">
            <h1 id="record-title" className="notice__title">
              {q.error instanceof ApiUnavailableError
                ? "This record isn't available"
                : "This record couldn't be read"}
            </h1>
            <p className="page__text">
              {q.error.message}.
              {q.error instanceof ApiUnavailableError &&
                " Relay's service may be down, or no plan exists at this address."}
            </p>
            <div className="notice__actions">
              <button
                type="button"
                className="btn btn--glass btn--small"
                onClick={() => void q.refetch()}
              >
                <Icon name="refresh" size={16} />
                Try again
              </button>
              <Link to="/" className="btn btn--ghost btn--small">
                Discover
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Record
          card={q.data.card}
          versions={q.data.versions}
          receivedAt={q.dataUpdatedAt}
        />
      )}
    </section>
  );
}

function Record({
  card,
  versions,
  receivedAt,
}: {
  card: PlanCardView;
  versions: VersionView[];
  receivedAt: number;
}) {
  const wall = useWallClock();
  const nowMs = chainNowMs(card.nowMs, receivedAt, wall);
  const live = liveEntry(card, nowMs);
  const v = card.version;
  const watchList = useWatchList();
  const watching = watchList.some((w) => w.planPda === card.planPda);
  const [toast, setToast] = useState<{ key: number; subject: string } | null>(
    null,
  );
  const [storageError, setStorageError] = useState(false);
  const planExplorer = explorerAccountUrl(card.planPda, card.cluster);
  const priceAgeMs = card.entry.price
    ? Math.max(0, nowMs - card.entry.price.observedAtMs)
    : null;
  const subject = `${creatorName(card)}'s ${card.pair.baseSymbol} plan`;

  const toggle = () => {
    const result = toggleWatched(
      card.planPda,
      planLabel(card),
      snapshotOf(card, live.status),
    );
    setStorageError(result === null);
    setToast((prev) =>
      result ? { key: (prev?.key ?? 0) + 1, subject } : null,
    );
  };

  return (
    <>
      <WatchToast toast={toast} onDismiss={() => setToast(null)} onPage />
      <header className="record-hero">
        <PairIcon
          base={card.pair.baseSymbol}
          quote={card.pair.quoteSymbol}
          size={40}
        />
        <div className="record-hero__text">
          <p className="record__kinds">
            <KindBadge kind="relay_plan" />
            {card.creator.isDemo && <span className="badge">Demo creator</span>}
            {!card.listed && <span className="badge">Unlisted</span>}
          </p>
          <h1 id="record-title" className="page__title record__title">
            {card.pair.label}
            <span className="record__title-sub">Buy plan</span>
          </h1>
          <p className="record__byline">
            By{" "}
            <Link
              to="/traders/$address"
              params={{ address: card.creator.address }}
            >
              {creatorName(card)}
            </Link>{" "}
            · published <time>{formatTimestamp(v.publishedAt)}</time> (chain
            time)
          </p>
          {!card.listed && (
            <p className="record__byline">
              Unlisted: this plan is real and on chain, but it is not shown in
              Relay&apos;s feed. Anyone can publish a plan to the program; Relay
              lists plans from selected creators only.
            </p>
          )}
        </div>
        <div className="record__actions">
          <button
            type="button"
            className="btn btn--glass"
            data-on={watching}
            aria-pressed={watching}
            onClick={toggle}
          >
            <Icon name={watching ? "star-filled" : "star"} size={18} />
            {watching ? "Watching" : "Watch"}
          </button>
          <Link
            to="/"
            search={{ plan: card.planPda }}
            className="btn btn--ghost"
          >
            Open in Discover
          </Link>
        </div>
      </header>
      {storageError && (
        <p className="watchlist__error" role="alert">
          Couldn't save: this browser is blocking local storage.
        </p>
      )}

      <div className="record-grid">
        <div className="record-main">
          <section aria-labelledby="record-status">
            <StatusBlock
              status={live.status}
              closingSoon={live.closingSoon}
              msUntilExpiry={live.msUntilExpiry}
              expiresAt={v.expiresAt}
              entryLowUnits={v.entryLowUnits}
              entryHighUnits={v.entryHighUnits}
              entryLow={v.entryLow}
              entryHigh={v.entryHigh}
              quoteDecimals={card.pair.quoteDecimals}
              price={card.entry.price}
              priceAgeMs={priceAgeMs}
              headingId="record-status"
              window={
                <span className="chip">
                  <Icon name="clock" size={15} />
                  {live.msUntilExpiry > 0 && live.status !== "closed" ? (
                    <>
                      Closes in{" "}
                      <span className="num">
                        {formatDuration(live.msUntilExpiry)}
                      </span>
                    </>
                  ) : (
                    "Window ended"
                  )}
                </span>
              }
            />
          </section>

          <section className="panel" aria-labelledby="posted-title">
            <h2 id="posted-title" className="panel__title">
              What was posted
            </h2>
            <dl className="facts">
              <div>
                <dt>Entry</dt>
                <dd className="num">
                  {formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}
                </dd>
              </div>
              <div>
                <dt>Window</dt>
                <dd>
                  Until <time>{formatTimestamp(v.expiresAt)}</time>
                </dd>
              </div>
              {v.text ? (
                <>
                  <div>
                    <dt>Why</dt>
                    <dd>“{v.text.rationale}”</dd>
                  </div>
                  <div>
                    <dt>Exit idea</dt>
                    <dd>
                      {v.text.exitThesis}
                      {v.text.exitTarget && (
                        <span className="facts__note">
                          Target{" "}
                          <span className="num">
                            {formatUsdText(v.text.exitTarget)}
                          </span>
                          . Not a stop order: nothing is sold for you.
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Off if</dt>
                    <dd>
                      {v.text.invalidation ?? (
                        <span className="facts__missing">Not stated.</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Price seen</dt>
                    <dd>
                      {v.text.refPrice ? (
                        <>
                          <span className="num">
                            {formatUsdText(v.text.refPrice.display)}
                          </span>
                          <span className="facts__note">
                            Recorded by the creator, from{" "}
                            {v.text.refPrice.source}.
                          </span>
                        </>
                      ) : (
                        <span className="facts__missing">Not recorded.</span>
                      )}
                    </dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Text</dt>
                  <dd>
                    <span className="facts__missing">Unavailable.</span>
                    <span className="facts__note">
                      Only the terms and the text's hash are on Solana.
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="panel" aria-labelledby="evidence-title">
            <h2 id="evidence-title" className="panel__title">
              Evidence
            </h2>
            <dl className="facts">
              <div>
                <dt>Source</dt>
                <dd>
                  Relay's program on Solana ({CLUSTER_LABEL[card.cluster]})
                  <span className="facts__note">
                    Signed by the creator's wallet, re-read from the chain.
                  </span>
                </dd>
              </div>
              <div>
                <dt>Plan account</dt>
                <dd>
                  <span className="num facts__id">{card.planPda}</span>
                  {planExplorer ? (
                    <a href={planExplorer} target="_blank" rel="noreferrer">
                      View on Solana Explorer
                      <Icon name="external" size={14} />
                    </a>
                  ) : (
                    <span className="facts__note">
                      No public explorer for the local fork.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Terms hash</dt>
                <dd className="num facts__id">{v.termsHash}</dd>
              </div>
              <div>
                <dt>Text hash</dt>
                <dd>
                  <span className="num facts__id">{v.contentHash}</span>
                  <span className="facts__note">
                    {v.text
                      ? "The text above matches this hash."
                      : "No text to check against it yet."}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>
                  <span className="facts__missing">
                    Not shown per plan yet.
                  </span>
                  <span className="facts__note">
                    Look up verified receipts by wallet in the{" "}
                    <Link to="/watchlist" search={{ tab: "history" }}>
                      Watchlist
                    </Link>
                    .
                  </span>
                </dd>
              </div>
            </dl>
            <details className="disclosure">
              <summary>
                Version history · {versions.length}
                <Icon name="details" size={16} />
              </summary>
              <ol className="versions">
                {versions.map((x) => (
                  <li key={x.versionPda}>
                    <span className="versions__head">
                      Version {x.version}
                      {x.version === v.version && " · current"}
                    </span>
                    <span className="versions__meta">
                      <time>{formatTimestamp(x.publishedAt)}</time> · entry{" "}
                      <span className="num">
                        {formatUsdText(x.entryLow)} –{" "}
                        {formatUsdText(x.entryHigh)}
                      </span>
                    </span>
                    <span className="versions__meta num facts__id">
                      {x.versionPda}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </div>

        <aside
          className="record-side"
          id="follow"
          aria-label="Follow this plan"
        >
          <TradePanel
            card={card}
            status={live.status}
            msUntilExpiry={live.msUntilExpiry}
          />
        </aside>
      </div>
    </>
  );
}
