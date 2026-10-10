import { Link, createFileRoute } from "@tanstack/react-router";
import { Cue } from "../components/cue/Cue";
import { Avatar } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
import { formatAge, shortAddress } from "../lib/format";
import { traderName, useTraderIndex, type TraderView } from "../lib/traders";

export const Route = createFileRoute("/traders/")({
  head: () => ({ meta: [{ title: "Traders · Relay" }] }),
  component: Traders,
});

function Traders() {
  const q = useTraderIndex();
  return (
    <section className="page" aria-labelledby="traders-title">
      <h1 id="traders-title" className="page__title">
        Traders
      </h1>
      <p className="page__text">
        Relay is starting with 10 selected Solana traders: their public ideas,
        each linked to its original source and time, beside the activity we can
        verify.
      </p>

      <aside className="notice" aria-labelledby="selected-title">
        <Cue pose="unavailable" className="notice__cue" />
        <div className="notice__body">
          <h2 id="selected-title" className="notice__title">
            Selected traders aren't connected yet
          </h2>
          <p className="page__text">
            None of their public sources is connected, so no selected trader is
            listed. Relay won't fill the gap with made-up profiles.
          </p>
          <p className="notice__links">
            <Link to="/demo">See the fictional walkthrough</Link>
            <Link to="/how-it-works">How Relay labels evidence</Link>
          </p>
        </div>
      </aside>

      <h2 className="page__section">Publishing through Relay</h2>
      <p className="page__text page__text--quiet">
        Wallets that signed a plan on Solana through Relay. A wallet is not a
        person: a name shows only when the wallet has a Relay profile, and
        seeded demo profiles are marked.
      </p>

      {q.isPending ? (
        <p className="page__text" aria-busy="true">
          Reading the wallets behind tonight's plans…
        </p>
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
          <ul className="traders">
            {q.data.traders.map((t) => (
              <TraderRow key={t.address} t={t} nowMs={q.data.nowMs} />
            ))}
          </ul>
          {q.data.truncated && (
            <p className="page__text page__text--quiet">
              Showing wallets from the newest plans only.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function TraderRow({ t, nowMs }: { t: TraderView; nowMs: number }) {
  const named = t.displayName !== null || t.handle !== null;
  return (
    <li>
      <Link
        to="/traders/$address"
        params={{ address: t.address }}
        className="trader-row"
      >
        <Avatar seed={t.address} size={44} />
        <span className="trader-row__text">
          <span className="trader-row__name">
            {traderName(t)}
            {t.isDemo ? (
              <span className="badge">Demo creator</span>
            ) : (
              !named && <span className="badge badge--quiet">Wallet only</span>
            )}
          </span>
          <span className="trader-row__meta">
            {named && t.handle && <>@{t.handle} · </>}
            <span className="num">{shortAddress(t.address)}</span>
          </span>
          <span className="trader-row__meta">
            <span className="num">{t.plans.length}</span>{" "}
            {t.plans.length === 1 ? "plan" : "plans"} · latest{" "}
            {formatAge(Math.max(0, nowMs - t.latestPublishedAt * 1000))}
          </span>
        </span>
        <Icon name="details" size={18} className="trader-row__chevron" />
      </Link>
    </li>
  );
}
