import { Link, createFileRoute } from "@tanstack/react-router";
import { Cue } from "../components/cue/Cue";
import { CLUSTER, CLUSTER_LABEL, RPC_URL } from "../lib/config";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account · Relay" }] }),
  component: Account,
});

function Account() {
  return (
    <section className="page" aria-labelledby="account-title">
      <h1 id="account-title" className="page__title">
        Account
      </h1>

      <h2 className="page__section">Wallet</h2>
      <p className="page__text">
        Connecting a wallet isn't available in this build yet. Browsing and
        watching don't need one. When it arrives, a wallet is only asked for to
        review a trade or publish a plan, and every trade is your own approval.
      </p>

      <h2 className="page__section">Network</h2>
      <dl className="facts">
        <div>
          <dt>Cluster</dt>
          <dd>
            {CLUSTER_LABEL[CLUSTER]}
            {CLUSTER === "localnet" &&
              " (Surfpool mainnet fork, test funds only)"}
          </dd>
        </div>
        <div>
          <dt>RPC</dt>
          <dd className="num">{RPC_URL}</dd>
        </div>
      </dl>

      <h2 className="page__section">Cue</h2>
      <div className="me-empty">
        <Cue pose="mascot" className="me-empty__cue" />
        <div>
          <p className="page__text">
            Cue is Relay's usher. Replay the opening any time, or walk through
            the fictional demo again.
          </p>
          <p className="me-empty__links">
            <Link to="/" search={{ welcome: true }}>
              Meet Cue again
            </Link>
            <Link to="/demo">Try the demo</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
