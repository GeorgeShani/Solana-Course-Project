import { Link, createFileRoute } from "@tanstack/react-router";
import { Cue } from "../components/cue/Cue";
import { Avatar } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import { PairIcon } from "../components/ui/TokenIcon";
import { cueReact } from "../lib/cue-cursor";
import { formatAge, shortAddress } from "../lib/format";
import { liveEntry } from "../lib/live-status";
import { STATUS_HEADLINE, STATUS_TONE } from "../lib/status";
import { toggleWatchedTrader, useWatchedTraders } from "../lib/trader-watch";
import { traderName, useTraderIndex, type TraderView } from "../lib/traders";

export const Route = createFileRoute("/traders/")({
  head: () => ({ meta: [{ title: "Traders · Relay" }] }),
  component: Traders,
});

function Traders() {
  const q = useTraderIndex();
  const watched = useWatchedTraders();
  return (
    <section
      className="page page--wide"
      aria-labelledby="traders-title"
      data-cursor-zone
    >
      <header className="page__head">
        <div>
          <h1 id="traders-title" className="page__title">
            Traders
          </h1>
          <p className="page__lede">
            Wallets that signed plans on Solana through Relay.
          </p>
        </div>
      </header>

      <aside className="callout" aria-labelledby="selected-title">
        <Cue pose="unavailable" className="callout__cue" />
        <div className="callout__body">
          <h2 id="selected-title" className="callout__title">
            The 10 selected traders aren't connected yet
          </h2>
          <p className="callout__text">
            Their public sources aren't linked, so they aren't listed. Relay
            won't fill the gap with made-up profiles.
          </p>
        </div>
        <Link to="/how-it-works" className="btn btn--ghost btn--small">
          How evidence works
        </Link>
      </aside>

      {q.isPending ? (
        <ul className="tgrid" aria-busy="true" aria-label="Loading traders">
          {[0, 1, 2].map((i) => (
            <li key={i} className="tcard tcard--ghost" />
          ))}
        </ul>
      ) : q.isError ? (
        <div className="notice notice--error" role="status">
          <Cue pose="unavailable" className="notice__cue" />
          <div className="notice__body">
            <p className="notice__title">Can't reach Relay's service</p>
            <p className="page__text">{q.error.message}.</p>
            <button
              type="button"
              className="btn btn--glass btn--small"
              onClick={() => void q.refetch()}
            >
              <Icon name="refresh" size={18} />
              Try again
            </button>
          </div>
        </div>
      ) : q.data.traders.length === 0 ? (
        <p className="page__text">
          No wallet has published a plan through Relay yet.
        </p>
      ) : (
        <>
          <ul className="tgrid">
            {q.data.traders.map((t) => (
              <TraderCard
                key={t.address}
                t={t}
                nowMs={q.data.nowMs}
                watching={watched.some((w) => w.address === t.address)}
              />
            ))}
          </ul>
          <p className="page__text page__text--quiet tgrid__foot">
            A wallet is not a person. Names come only from a Relay profile;
            seeded demo profiles are marked.
            {q.data.truncated && " Showing wallets from the newest plans only."}
          </p>
        </>
      )}
    </section>
  );
}

function TraderCard({
  t,
  nowMs,
  watching,
}: {
  t: TraderView;
  nowMs: number;
  watching: boolean;
}) {
  const named = t.displayName !== null || t.handle !== null;
  const latest = t.plans[0];
  const status = latest ? liveEntry(latest, nowMs).status : null;
  const name = traderName(t);
  const count = t.plans.length;

  return (
    <li className="tcard lift">
      <div className="tcard__head">
        <Avatar seed={t.address} size={56} />
        <div className="tcard__who">
          <Link
            to="/traders/$address"
            params={{ address: t.address }}
            className="tcard__link"
          >
            {name}
          </Link>
          <p className="tcard__meta">
            {named && t.handle && <>@{t.handle} · </>}
            <span className="num">{shortAddress(t.address)}</span>
          </p>
          <p className="tcard__badges">
            {t.isDemo ? (
              <span className="badge">Demo creator</span>
            ) : (
              !named && <span className="badge badge--quiet">Wallet only</span>
            )}
          </p>
        </div>
      </div>

      <p className="tcard__basis">
        <KindBadge kind="relay_plan" />
        <span className="tcard__meta">
          Signed <span className="num">{count}</span>{" "}
          {count === 1 ? "plan" : "plans"}
        </span>
      </p>

      {latest && status && (
        <div className="tcard__latest">
          <PairIcon
            base={latest.pair.baseSymbol}
            quote={latest.pair.quoteSymbol}
            size={28}
          />
          <div className="tcard__latest-text">
            <p className="tcard__latest-title">{latest.pair.label} buy plan</p>
            <p className="tcard__latest-now">
              <span
                className="watchlist__status"
                data-tone={STATUS_TONE[status]}
              >
                {STATUS_HEADLINE[status]}
              </span>
              <span className="tcard__meta">
                {formatAge(Math.max(0, nowMs - t.latestPublishedAt * 1000))}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="tcard__actions">
        <button
          type="button"
          className="btn btn--glass btn--small"
          aria-pressed={watching}
          data-on={watching}
          aria-label={watching ? `Stop watching ${name}` : `Watch ${name}`}
          onClick={() => {
            const on = toggleWatchedTrader(
              t.address,
              name,
              t.latestPublishedAt,
            );
            if (on) cueReact();
          }}
        >
          <Icon name={watching ? "star-filled" : "star"} size={16} />
          {watching ? "Watching" : "Watch"}
        </button>
        <span className="tcard__open" aria-hidden="true">
          Profile
          <Icon name="next" size={16} />
        </span>
      </div>
    </li>
  );
}
