import { Link } from "@tanstack/react-router";
import { Icon } from "../../../components/ui/Icon";
import { SourceCard } from "./SourceCard";
import { CLUSTER } from "../../../lib/config";
import {
  eventKind,
  formatWhen,
  relationshipTone,
  safeHref,
  shortDate,
  type EventView,
  type PublicEvidenceRequest,
} from "../model";
import { explorerTxUrl } from "../../../lib/sources";

function PlanNote({ plan }: { plan: NonNullable<EventView["plan"]> }) {
  if (!plan.known)
    return (
      <p className="tl__note">
        Relay has not read this plan from Solana yet, so it cannot show its
        terms.
      </p>
    );
  if (plan.creatorMatchesLinkedWallet === true)
    return (
      <p className="tl__note">
        The wallet that signed this plan is a wallet linked to this trader.
      </p>
    );
  if (plan.creatorMatchesLinkedWallet === false)
    return (
      <p className="tl__note tl__note--warn">
        The wallet that signed this plan is not a wallet linked to this trader.
        Treat the link as unconfirmed.
      </p>
    );
  return (
    <p className="tl__note">
      No wallet is linked to this trader, so Relay cannot say who signed this
      plan.
    </p>
  );
}

function Evidence({ event }: { event: EventView }) {
  const e = event.evidence;
  if (!e) return null;
  if (e.kind === "url") {
    const href = safeHref(e.ref);
    return (
      <p className="tl__evidence">
        <Icon name="external" size={14} />
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            Open source
          </a>
        ) : (
          <span>No safe link to the reference.</span>
        )}
        <span className="tl__host">
          {href
            ? `opens ${new URL(href).host}, a site Relay does not control`
            : ""}
        </span>
      </p>
    );
  }
  if (e.kind === "transaction") {
    const href = explorerTxUrl(e.ref, CLUSTER);
    return (
      <p className="tl__evidence">
        <Icon name="chain" size={14} />
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            Open the transaction on Solana
          </a>
        ) : (
          <span>A Solana transaction (no public explorer on this network)</span>
        )}
      </p>
    );
  }
  if (e.kind === "relay_plan") {
    return (
      <p className="tl__evidence">
        <Icon name="plans" size={14} />
        <Link to="/plans/$planPda" params={{ planPda: e.ref }}>
          Open the plan
        </Link>
      </p>
    );
  }
  return null;
}

/**
 * The idea's timeline, oldest first. Each entry shows its date, a short summary, how it relates to
 * the original (author update, related commentary, or link not established), and a source link.
 * Nothing here says a claim is true.
 */
export function Timeline({
  events,
  requests,
  onAsk,
  highlight,
}: {
  events: readonly EventView[];
  requests: readonly PublicEvidenceRequest[];
  onAsk: (eventId: string) => void;
  /** Events newer than the reader's last visit are marked. */
  highlight?: (event: EventView) => boolean;
}) {
  return (
    <ol className="tl" aria-label="Timeline">
      {events.map((e) => {
        const kind = eventKind(e);
        const isOrigin = e.relationship.basis === "original";
        const tone = relationshipTone(e.relationship.basis);
        const asked = requests.filter((r) => r.aboutEventId === e.id).length;
        const fresh = highlight?.(e) ?? false;
        const when = shortDate(e.occurredAt) ?? shortDate(e.recordedAt);
        return (
          <li
            key={e.id}
            id={`event-${e.id}`}
            className="tl__item"
            data-type={e.type}
            data-basis={e.relationship.basis}
            data-tone={tone}
            data-new={fresh}
          >
            <div className="tl__marker" aria-hidden="true" />
            <div className="tl__body">
              <p className="tl__head">
                <span className="tl__label" data-tone={tone}>
                  {kind.label}
                </span>
                {when && (
                  <time
                    className="tl__date"
                    dateTime={e.occurredAt ?? e.recordedAt}
                    title={
                      e.occurredAt
                        ? `Happened ${formatWhen(e.occurredAt)} · Recorded ${formatWhen(e.recordedAt)}`
                        : `Recorded ${formatWhen(e.recordedAt)} (event time unknown)`
                    }
                  >
                    {when}
                  </time>
                )}
                {fresh && <span className="badge">New</span>}
                {e.reviewState === "reviewed" && (
                  <span className="badge badge--quiet">Reviewed</span>
                )}
              </p>
              <p className="tl__summary">{e.summary}</p>
              {e.relationship.note && (
                <p className="tl__note">{e.relationship.note}</p>
              )}
              {e.plan && <PlanNote plan={e.plan} />}
              <Evidence event={e} />
              {e.source && !isOrigin && (
                <SourceCard source={e.source} heading="Source for this entry" />
              )}
              <p className="tl__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => onAsk(e.id)}
                >
                  Ask for evidence
                </button>
                {asked > 0 && (
                  <span className="tl__host">
                    {asked} {asked === 1 ? "question" : "questions"} asked
                  </span>
                )}
              </p>
              <details className="tl__more">
                <summary>What this means</summary>
                <p>{kind.meaning}</p>
                {!e.occurredAt && (
                  <p className="tl__note">
                    The source gives no event time. Relay recorded it{" "}
                    {formatWhen(e.recordedAt)}.
                  </p>
                )}
                <p className="source__hash num">{e.hash}</p>
              </details>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
