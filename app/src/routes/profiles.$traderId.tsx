import { Link, createFileRoute } from "@tanstack/react-router";
import { DemoBadge, IdeaCard } from "../components/discovery/Cards";
import { WatchButton } from "../components/discovery/WatchButton";
import { Cue } from "../components/cue/Cue";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import {
  DiscoveryNotFoundError,
  PARTICIPATION_LABEL,
  PROVIDER_LABEL,
  RELATIONSHIP_LABEL,
  formatWhen,
  safeHref,
} from "../lib/discovery";
import { useSourcedTrader } from "../lib/discovery-queries";

export const Route = createFileRoute("/profiles/$traderId")({
  head: () => ({ meta: [{ title: "Profile · Relay" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { traderId } = Route.useParams();
  const q = useSourcedTrader(traderId);

  if (q.isPending)
    return (
      <section className="page page--wide" aria-busy="true" data-cursor-zone>
        <BackLink fallback="/traders" label="Traders" />
        <p className="page__text">Loading the profile…</p>
      </section>
    );

  if (q.isError)
    return (
      <section className="page page--wide" data-cursor-zone>
        <BackLink fallback="/traders" label="Traders" />
        {q.error instanceof DiscoveryNotFoundError ? (
          <div className="notice" role="status">
            <Cue pose="unavailable" className="notice__cue" />
            <div className="notice__body">
              <p className="notice__title">Relay has no such profile</p>
              <p className="page__text">
                It may have been removed, or the link may be wrong.
              </p>
              <Link to="/traders" className="btn btn--glass btn--small">
                See all traders
              </Link>
            </div>
          </div>
        ) : (
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
        )}
      </section>
    );

  const t = q.data;
  return (
    <article
      className="page page--wide"
      aria-labelledby="profile-title"
      data-cursor-zone
    >
      <BackLink fallback="/traders" label="Traders" />
      <header className="idea__head">
        <p className="icard__badges">
          {t.isDemo && <DemoBadge />}
          <span className="badge badge--quiet">Manual coverage</span>
        </p>
        <h1 id="profile-title" className="page__title">
          {t.displayName}
        </h1>
        <p className="idea__by">
          <span>
            {t.markets.length > 0 ? t.markets.join(", ") : "Market not stated"}
          </span>
          <span>{PARTICIPATION_LABEL[t.participation]}</span>
        </p>
        <WatchButton
          type="trader"
          id={t.id}
          label={t.displayName}
          seenSeq={t.latestSeq}
        />
      </header>

      <section aria-labelledby="basis-title">
        <h2 id="basis-title" className="page__subsection">
          Why this profile is here
        </h2>
        <p className="page__text">{t.attributionBasis}</p>
        <p className="page__text">
          <strong>What this does not cover.</strong> {t.coverageLimits}
        </p>
        {t.ownerConfirmed && (
          <p className="page__text page__text--quiet">
            Relay's owner ({t.ownerConfirmed.by}) confirmed the sources on{" "}
            {formatWhen(t.ownerConfirmed.at)}.
          </p>
        )}
      </section>

      <section aria-labelledby="links-title">
        <h2 id="links-title" className="page__subsection">
          Accounts linked to this profile
        </h2>
        {t.links.length === 0 ? (
          <p className="page__text">No accounts are linked.</p>
        ) : (
          <ul className="linklist">
            {t.links.map((l) => {
              const href = safeHref(l.value);
              return (
                <li key={`${l.kind}:${l.value}`} className="linklist__item">
                  <p className="linklist__head">
                    <span className="source__provider">
                      {PROVIDER_LABEL[l.kind] ?? l.kind}
                    </span>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {l.value}
                      </a>
                    ) : (
                      <span className="num">{l.value}</span>
                    )}
                  </p>
                  <p className="linklist__basis">
                    <span className="badge badge--quiet">
                      {RELATIONSHIP_LABEL[l.identityBasis]}
                    </span>
                    {l.basisNote && <span>{l.basisNote}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="page__text page__text--quiet">
          An account is linked only on the basis shown. "Linked by Relay's
          curator" and "Link uncertain" mean the trader has not confirmed it.
        </p>
      </section>

      <section aria-labelledby="ideas-title">
        <h2 id="ideas-title" className="page__subsection">
          Ideas ({t.ideas.length})
        </h2>
        {t.ideas.length === 0 ? (
          <p className="page__text">No ideas have been recorded yet.</p>
        ) : (
          <ul className="igrid">
            {t.ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </ul>
        )}
      </section>

      <p className="page__text page__text--quiet">
        Not financial advice. Unless the profile says the trader agreed to take
        part, it does not mean the trader knows about Relay or endorses it, and
        Relay does not endorse the trader.
      </p>
    </article>
  );
}
