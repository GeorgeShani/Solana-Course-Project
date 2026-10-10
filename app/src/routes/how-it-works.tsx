import { Link, createFileRoute } from "@tanstack/react-router";
import { Cue } from "../components/cue/Cue";
import { KindBadge } from "../components/ui/KindBadge";
import { RECORD_KIND, type RecordKind } from "../lib/record-kind";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "How it works · Relay" }] }),
  component: HowItWorks,
});

const KINDS: readonly RecordKind[] = [
  "public_post",
  "onchain",
  "relay_plan",
  "fictional",
];

function HowItWorks() {
  return (
    <section className="page" aria-labelledby="how-title">
      <h1 id="how-title" className="page__title">
        How it works
      </h1>
      <p className="page__text">
        Relay follows Solana traders in one place: what they say in public, and
        what can be checked. Every record carries its kind, its original source
        and its time, so you can tell an idea from evidence.
      </p>

      <h2 className="page__section">Four kinds of record</h2>
      <ul className="kinds">
        {KINDS.map((k) => (
          <li key={k}>
            <KindBadge kind={k} />
            <p className="page__text">{RECORD_KIND[k].meaning}</p>
          </li>
        ))}
      </ul>

      <h2 className="page__section">What Relay won't do</h2>
      <ul className="rules">
        <li>Treat a post as proof that a trade happened.</li>
        <li>Link a wallet to a person without support for it.</li>
        <li>
          Fill missing data: unknown returns, entries and endorsements stay
          missing.
        </li>
        <li>Trade for you. Watching needs no wallet and never trades.</li>
      </ul>

      <h2 className="page__section">Connected today</h2>
      <dl className="facts">
        <div>
          <dt>Relay plans</dt>
          <dd>
            Connected: read from Relay's program on Solana, with their full
            version history.
          </dd>
        </div>
        <div>
          <dt>Follow receipts</dt>
          <dd>
            Connected: verified on chain, looked up by wallet in the Watchlist.
          </dd>
        </div>
        <div>
          <dt>Public posts</dt>
          <dd>
            <span className="facts__missing">Not connected yet.</span>
          </dd>
        </div>
        <div>
          <dt>Selected traders</dt>
          <dd>
            <span className="facts__missing">
              Not connected yet: none of the 10 traders' sources is linked.
            </span>
          </dd>
        </div>
        <div>
          <dt>Other activity</dt>
          <dd>
            <span className="facts__missing">
              Not indexed yet: wallet trades outside Relay aren't read.
            </span>
          </dd>
        </div>
      </dl>

      <div className="me-empty how__end">
        <Cue pose="mascot" className="me-empty__cue" />
        <div>
          <p className="page__text">
            Want to see it end to end first? The walkthrough uses a fictional
            trader and simulated prices.
          </p>
          <p className="me-empty__links">
            <Link to="/demo">Try the demo</Link>
            <Link to="/traders">Browse traders</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
