import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cue } from "../components/cue/Cue";
import { StatusBlock } from "../components/feed/StatusBlock";
import { WatchToast } from "../components/feed/WatchToast";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
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
    <section className="page" aria-labelledby="record-title">
      <BackLink fallback="/" label="Discover" />
      {q.isPending ? (
        <>
          <h1 id="record-title" className="page__title">
            Record
          </h1>
          <p className="page__text" aria-busy="true">
            Reading the record and its evidence…
          </p>
        </>
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
            <p className="notice__links">
              <button type="button" onClick={() => void q.refetch()}>
                Try again
              </button>
              <Link to="/">Discover</Link>
            </p>
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
      <p className="record__kinds">
        <KindBadge kind="relay_plan" />
        {card.creator.isDemo && <span className="badge">Demo creator</span>}
      </p>
      <h1 id="record-title" className="page__title record__title">
        {card.pair.label} <span className="record__title-sub">Buy plan</span>
      </h1>
      <p className="record__tagline">Follow the plan. See the proof.</p>
      <p className="record__byline">
        By{" "}
        <Link to="/traders/$address" params={{ address: card.creator.address }}>
          {creatorName(card)}
        </Link>{" "}
        · published <time>{formatTimestamp(v.publishedAt)}</time> (chain time)
      </p>
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
        <Link to="/" search={{ plan: card.planPda }} className="btn btn--glass">
          Open in Discover
        </Link>
      </div>
      {storageError && (
        <p className="watchlist__error" role="alert">
          Couldn't save: this browser is blocking local storage.
        </p>
      )}

      <h2 className="page__section">What was posted</h2>
      <dl className="facts">
        <div>
          <dt>Entry range</dt>
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
                      As the creator recorded it, from {v.text.refPrice.source}.
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
                Only the terms and the text's hash are on Solana; the text
                itself hasn't reached Relay.
              </span>
            </dd>
          </div>
        )}
      </dl>
      <p className="page__text page__text--quiet">
        An exit idea is not a stop-loss order. Nothing is sold for you.
      </p>

      <h2 className="page__section">Status now</h2>
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

      <h2 className="page__section">Evidence</h2>
      <dl className="facts">
        <div>
          <dt>Source</dt>
          <dd>
            Relay's program on Solana ({CLUSTER_LABEL[card.cluster]})
            <span className="facts__note">
              The creator's wallet signed this plan; the server re-read it from
              the chain.
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
          <dt>Version {v.version}</dt>
          <dd className="num facts__id">{v.versionPda}</dd>
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
            <span className="facts__missing">Not shown per plan yet.</span>
            <span className="facts__note">
              Verified receipts can be looked up by wallet in the{" "}
              <Link to="/watchlist">Watchlist</Link>.
            </span>
          </dd>
        </div>
      </dl>

      <h2 className="page__section">Version history</h2>
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
                {formatUsdText(x.entryLow)} – {formatUsdText(x.entryHigh)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="page__section">Following this plan</h2>
      <p className="page__text">
        {live.status === "expired" || live.status === "closed"
          ? "The entry window has ended, so this plan can't be followed."
          : live.status === "in_range"
            ? "Following means a fresh quote checked against this plan's range and window, approved in your own wallet. Reviewing a trade isn't available in this build yet."
            : "Following opens only while the price is inside the plan's range. Watching never trades."}
      </p>
    </>
  );
}
