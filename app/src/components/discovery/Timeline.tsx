import { Link } from "@tanstack/react-router";
import { Icon } from "../ui/Icon";
import { SourceCard } from "./SourceCard";
import { CLUSTER } from "../../lib/config";
import {
  RELATIONSHIP_LABEL,
  eventLabel,
  formatWhen,
  safeHref,
  type EventView,
  type PublicEvidenceRequest,
} from "../../lib/discovery";
import { explorerTxUrl } from "../../lib/sources";

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
            Open the reference
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
        <Link to="/records/$planPda" params={{ planPda: e.ref }}>
          Open the plan
        </Link>
      </p>
    );
  }
  return null;
}

/**
 * The idea's timeline, oldest first. Each entry says what it is (a statement, evidence a curator
 * linked, a reviewer's response), how it relates to the idea, and when it happened versus when
 * Relay recorded it. Nothing here says a claim is true.
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
        const kind = eventLabel(e.type);
        const isOrigin = e.relationship.basis === "original";
        const asked = requests.filter((r) => r.aboutEventId === e.id).length;
        const fresh = highlight?.(e) ?? false;
        return (
          <li
            key={e.id}
            id={`event-${e.id}`}
            className="tl__item"
            data-type={e.type}
            data-new={fresh}
          >
            <div className="tl__marker" aria-hidden="true" />
            <div className="tl__body">
              <p className="tl__head">
                <span className="tl__label">{kind.label}</span>
                {fresh && <span className="badge">New</span>}
                {!isOrigin && e.type !== "evidence_requested" && (
                  <span className="badge badge--quiet">
                    {RELATIONSHIP_LABEL[e.relationship.basis]}
                  </span>
                )}
                {e.reviewState === "reviewed" && (
                  <span className="badge badge--quiet">Reviewed by Relay</span>
                )}
              </p>
              <p className="tl__when">
                <span>
                  Happened{" "}
                  <time dateTime={e.occurredAt ?? undefined}>
                    {formatWhen(e.occurredAt)}
                  </time>
                </span>
                <span>Recorded {formatWhen(e.recordedAt)}</span>
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
                  Ask for evidence about this
                </button>
                {asked > 0 && (
                  <span className="tl__host">
                    {asked} {asked === 1 ? "question" : "questions"} asked
                  </span>
                )}
              </p>
              <details className="tl__more">
                <summary>{kind.label}: what this means</summary>
                <p>{kind.meaning}</p>
                <p className="source__hash num">{e.hash}</p>
              </details>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
