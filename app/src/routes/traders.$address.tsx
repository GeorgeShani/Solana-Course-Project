import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cue } from "../components/cue/Cue";
import { WatchToast } from "../components/feed/WatchToast";
import { Portrait } from "../components/theatre/Portrait";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import type { PlanCardView } from "../lib/api";
import { useWallClock } from "../lib/clock";
import { CLUSTER, CLUSTER_LABEL } from "../lib/config";
import { formatUsdText } from "../lib/format";
import { chainNowMs, liveEntry } from "../lib/live-status";
import { isAddress } from "../lib/my-plans";
import { explorerAccountUrl, formatTimestamp } from "../lib/sources";
import { STATUS_HEADLINE, STATUS_TONE } from "../lib/status";
import { toggleWatchedTrader, useWatchedTraders } from "../lib/trader-watch";
import { traderName, useTraderIndex, type TraderView } from "../lib/traders";

export const Route = createFileRoute("/traders/$address")({
  head: () => ({ meta: [{ title: "Trader · Relay" }] }),
  component: TraderProfile,
});

function TraderProfile() {
  const { address } = Route.useParams();
  const q = useTraderIndex();
  const trader = q.data?.traders.find((t) => t.address === address);

  return (
    <section className="page" aria-labelledby="trader-title">
      <BackLink fallback="/traders" label="Traders" />
      {!isAddress(address) ? (
        <Missing
          title="That isn't a wallet address"
          text="Trader profiles are addressed by the Solana wallet that signed their plans."
        />
      ) : q.isPending ? (
        <>
          <h1 id="trader-title" className="page__title">
            Trader
          </h1>
          <p className="page__text" aria-busy="true">
            Reading this wallet's records…
          </p>
        </>
      ) : q.isError ? (
        <div className="notice notice--error" role="status">
          <Cue pose="unavailable" className="notice__cue" />
          <div className="notice__body">
            <h1 id="trader-title" className="notice__title">
              Can't reach Relay's service
            </h1>
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
      ) : !trader ? (
        <Missing
          title="No records from this wallet"
          text="This wallet hasn't published a plan through Relay, and no other source for it is connected."
        />
      ) : (
        <Profile
          trader={trader}
          serverNowMs={q.data.nowMs}
          receivedAt={q.dataUpdatedAt}
        />
      )}
    </section>
  );
}

function Missing({ title, text }: { title: string; text: string }) {
  return (
    <div className="notice">
      <Cue pose="unavailable" className="notice__cue" />
      <div className="notice__body">
        <h1 id="trader-title" className="notice__title">
          {title}
        </h1>
        <p className="page__text">{text}</p>
        <p className="notice__links">
          <Link to="/traders">All traders</Link>
          <Link to="/">Discover</Link>
        </p>
      </div>
    </div>
  );
}

function Profile({
  trader: t,
  serverNowMs,
  receivedAt,
}: {
  trader: TraderView;
  serverNowMs: number;
  receivedAt: number;
}) {
  const wall = useWallClock();
  const nowMs = chainNowMs(serverNowMs, receivedAt, wall);
  const watched = useWatchedTraders();
  const watching = watched.some((w) => w.address === t.address);
  const [toast, setToast] = useState<{ key: number; subject: string } | null>(
    null,
  );
  const [storageError, setStorageError] = useState(false);
  const name = traderName(t);
  const explorer = explorerAccountUrl(t.address, CLUSTER);

  const toggle = () => {
    const result = toggleWatchedTrader(t.address, name, t.latestPublishedAt);
    setStorageError(result === null);
    setToast((prev) =>
      result ? { key: (prev?.key ?? 0) + 1, subject: name } : null,
    );
  };

  return (
    <>
      <WatchToast toast={toast} onDismiss={() => setToast(null)} onPage />
      <header className="profile">
        <div className="profile__portrait">
          <Portrait seed={t.address} />
        </div>
        <div className="profile__who">
          <h1 id="trader-title" className="page__title profile__name">
            {t.isDemo ? name.replace(/\s*\(demo\)$/i, "") : name}
          </h1>
          <p className="profile__byline">
            {t.handle && <span>@{t.handle}</span>}
            {t.isDemo ? (
              <span className="badge">Demo creator</span>
            ) : (
              !t.displayName &&
              !t.handle && (
                <span className="badge badge--quiet">Wallet only</span>
              )
            )}
          </p>
          <div className="profile__actions">
            <button
              type="button"
              className="btn btn--glass"
              data-on={watching}
              aria-pressed={watching}
              onClick={toggle}
            >
              <Icon name={watching ? "star-filled" : "star"} size={18} />
              {watching ? "Watching trader" : "Watch trader"}
            </button>
          </div>
          {storageError && (
            <p className="watchlist__error" role="alert">
              Couldn't save: this browser is blocking local storage.
            </p>
          )}
        </div>
      </header>

      <h2 className="page__section">Identity</h2>
      <dl className="facts">
        <div>
          <dt>Wallet</dt>
          <dd>
            <span className="num facts__id">{t.address}</span>
            <span className="facts__note">
              Linked by signature: this wallet signed the{" "}
              {t.plans.length === 1 ? "plan" : "plans"} below on Solana.
            </span>
          </dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>
            {t.isDemo ? (
              <>
                {name}
                <span className="facts__note">
                  Seeded demo profile: the name is fictional. The plans are real
                  records on the {CLUSTER_LABEL[CLUSTER]} cluster.
                </span>
              </>
            ) : t.displayName || t.handle ? (
              name
            ) : (
              <span className="facts__missing">
                None. This wallet has no Relay profile.
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Public sources</dt>
          <dd>
            <span className="facts__missing">None connected.</span>
            <span className="facts__note">
              Relay links an account such as X or Telegram only when the trader
              shows it's theirs.
            </span>
          </dd>
        </div>
        <div>
          <dt>Explorer</dt>
          <dd>
            {explorer ? (
              <a href={explorer} target="_blank" rel="noreferrer">
                View wallet on Solana Explorer
                <Icon name="external" size={14} />
              </a>
            ) : (
              <span className="facts__missing">
                No public explorer for the local fork.
              </span>
            )}
          </dd>
        </div>
      </dl>

      <h2 className="page__section">Records</h2>
      <ul className="records">
        {t.plans.map((card) => (
          <RecordRow key={card.planPda} card={card} nowMs={nowMs} />
        ))}
      </ul>

      <h2 className="page__section">Not connected yet</h2>
      <ul className="gaps">
        <li>
          <KindBadge kind="public_post" />
          <span>No source connected for this wallet's public ideas.</span>
        </li>
        <li>
          <KindBadge kind="onchain" />
          <span>
            Other on-chain activity isn't indexed yet. Only plans published
            through Relay are shown.
          </span>
        </li>
      </ul>
    </>
  );
}

function RecordRow({ card, nowMs }: { card: PlanCardView; nowMs: number }) {
  const status = liveEntry(card, nowMs).status;
  const v = card.version;
  return (
    <li>
      <Link
        to="/records/$planPda"
        params={{ planPda: card.planPda }}
        className="record-row"
      >
        <span className="record-row__top">
          <KindBadge kind="relay_plan" />
          <span className="record-row__time">
            {formatTimestamp(v.publishedAt)}
          </span>
        </span>
        <span className="record-row__title">{card.pair.label} · Buy plan</span>
        <span className="record-row__terms">
          Entry{" "}
          <span className="num">
            {formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}
          </span>
          {card.versionCount > 1 && <> · version {v.version}</>}
        </span>
        <span className="watchlist__status" data-tone={STATUS_TONE[status]}>
          {STATUS_HEADLINE[status]}
        </span>
      </Link>
    </li>
  );
}
