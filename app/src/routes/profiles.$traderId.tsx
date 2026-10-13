import { Link, createFileRoute } from "@tanstack/react-router";
import { Avatar } from "../features/discovery/components/Avatar";
import { DemoBadge, IdeaCard } from "../features/discovery/components/Cards";
import { WatchButton } from "../features/discovery/components/WatchButton";
import { Cue } from "../components/cue/Cue";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import {
  DiscoveryNotFoundError,
  CURATION_NOTE,
  IDENTITY_LABEL,
  PARTICIPATION_LABEL,
  PROVIDER_LABEL,
  formatWhen,
  latestCapture,
  safeHref,
  sourceHost,
} from "../features/discovery/model";
import { useSourcedTrader } from "../features/discovery/queries";

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
        <BackLink fallback="/" label="Discover" />
        <p className="page__text">Loading the profile…</p>
      </section>
    );

  if (q.isError)
    return (
      <section className="page page--wide" data-cursor-zone>
        <BackLink fallback="/" label="Discover" />
        {q.error instanceof DiscoveryNotFoundError ? (
          <div className="notice" role="status">
            <Cue pose="unavailable" className="notice__cue" />
            <div className="notice__body">
              <p className="notice__title">Relay has no such profile</p>
              <p className="page__text">
                It may have been removed, or the link may be wrong.
              </p>
              <Link to="/" className="btn btn--glass btn--small">
                Back to Discover
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
  const capture = latestCapture(t.ideas);
  return (
    <article
      className="page page--wide profile-page"
      aria-labelledby="profile-title"
      data-cursor-zone
    >
      <BackLink fallback="/" label="Discover" />

      <header className="profile-id">
        <Avatar id={t.id} name={t.displayName} className="profile-id__avatar" />
        <div className="profile-id__who">
          <p className="icard__badges">
            {t.isDemo && <DemoBadge />}
            <span className="badge badge--quiet">
              {PARTICIPATION_LABEL[t.participation]}
            </span>
            <span className="badge badge--quiet">Manual coverage</span>
          </p>
          <h1 id="profile-title" className="page__title">
            {t.displayName}
          </h1>
          <p className="idea__by">
            <span>
              {t.markets.length > 0
                ? t.markets.join(", ")
                : "Market not stated"}
            </span>
            <span>
              {t.ideas.length} {t.ideas.length === 1 ? "idea" : "ideas"}
            </span>
          </p>
          <WatchButton
            type="trader"
            id={t.id}
            label={t.displayName}
            seenSeq={t.latestSeq}
          />
        </div>
      </header>

      <section
        className="profile-sources"
        aria-labelledby="profile-sources-title"
      >
        <h2 id="profile-sources-title" className="page__subsection">
          Sources
        </h2>
        {t.links.length === 0 ? (
          <p className="page__text page__text--quiet">
            No accounts are linked.
          </p>
        ) : (
          <ul className="profile-sources__list">
            {t.links.map((l) => {
              const href = safeHref(l.value);
              const host = href ? sourceHost(href) : null;
              return (
                <li key={`${l.kind}:${l.value}`}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="profile-sources__link"
                    >
                      <span>
                        {PROVIDER_LABEL[l.kind] ?? l.kind}
                        {host ? ` · ${host}` : ""}
                      </span>
                      <Icon name="external" size={14} />
                    </a>
                  ) : (
                    <span className="num">{l.value}</span>
                  )}
                  <span className="badge badge--quiet">
                    {IDENTITY_LABEL[l.identityBasis]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
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

      <details className="disclosure">
        <summary>
          How Relay recorded this
          <Icon name="details" size={16} />
        </summary>
        <p className="page__text">{t.attributionBasis}</p>
        <p className="page__text page__text--quiet">{CURATION_NOTE}</p>
        <p className="page__text">
          <strong>What this does not cover.</strong> {t.coverageLimits}
        </p>
        {capture && (
          <p className="page__text page__text--quiet">
            Newest capture: {formatWhen(capture)}. Relay does not watch these
            accounts live.
          </p>
        )}
        {t.ownerConfirmed && (
          <p className="page__text page__text--quiet">
            Relay's owner ({t.ownerConfirmed.by}) confirmed the sources on{" "}
            {formatWhen(t.ownerConfirmed.at)}.
          </p>
        )}
        <p className="page__text page__text--quiet">
          A source link is shown only on the basis next to it. Linked by Relay
          and Link uncertain mean the author has not confirmed the account.
        </p>
      </details>

      <p className="page__text page__text--quiet">
        Not financial advice. Unless the profile says the trader agreed to take
        part, it does not mean the trader knows about Relay or endorses it.
      </p>
    </article>
  );
}
