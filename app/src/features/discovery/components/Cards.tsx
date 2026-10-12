import { Link } from "@tanstack/react-router";
import { KindBadge } from "../../../components/ui/KindBadge";
import {
  PARTICIPATION_LABEL,
  RECORD_TYPE_LABEL,
  formatWhen,
  latestUpdateLabel,
  sourceHost,
  type IdeaSummary,
  type TraderSummary,
} from "../model";
import { WatchButton } from "./WatchButton";

function excerpt(text: string | null, max = 180): string | null {
  if (text === null) return null;
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
}

/** Marks seeded, fictional rows so they can never be mistaken for a real trader's idea. */
export function DemoBadge() {
  return <KindBadge kind="fictional" />;
}

export function IdeaCard({
  idea,
  unread,
}: {
  idea: IdeaSummary;
  /** How many entries are newer than the reader's last visit, when they watch this idea. */
  unread?: number;
}) {
  const quote = idea.original.contentRemoved
    ? null
    : excerpt(idea.original.displayedContent);
  const later = latestUpdateLabel(idea);
  const kind = RECORD_TYPE_LABEL[idea.original.recordType] ?? "Source";
  const host = sourceHost(idea.original.url);
  return (
    <li className="icard lift" data-demo={idea.isDemo}>
      <p className="icard__badges">
        {idea.isDemo ? <DemoBadge /> : <KindBadge kind="public_post" />}
        <span className="badge badge--quiet">Manual coverage</span>
        {unread !== undefined && unread > 0 && (
          <span className="badge">{unread} new</span>
        )}
      </p>
      <h3 className="icard__title">
        <Link to="/ideas/$ideaId" params={{ ideaId: idea.id }}>
          {idea.title}
        </Link>
      </h3>
      <p className="icard__meta">
        <Link
          to="/profiles/$traderId"
          params={{ traderId: idea.trader.id }}
          className="icard__trader"
        >
          {idea.trader.displayName}
        </Link>
        {idea.assets.length > 0 && <span>{idea.assets.join(", ")}</span>}
        <span>{idea.market}</span>
      </p>
      {quote ? (
        <blockquote className="icard__quote">{quote}</blockquote>
      ) : (
        <p className="icard__quote icard__quote--gone">
          The original text is no longer shown.
        </p>
      )}
      <p className="icard__meta icard__meta--quiet">
        <span>
          {kind}
          {host ? ` · ${host}` : ""}
        </span>
        <span>
          {idea.original.publishedAt === null
            ? "Publication time unknown"
            : `Published ${formatWhen(idea.original.publishedAt)}`}
        </span>
      </p>
      <p className="icard__later" data-later={later !== null}>
        {later === null ? "No later item recorded yet" : `Later: ${later}`}
      </p>
      <div className="icard__actions">
        <WatchButton
          type="idea"
          id={idea.id}
          label={idea.title}
          seenSeq={idea.latestSeq}
        />
        <Link
          to="/ideas/$ideaId"
          params={{ ideaId: idea.id }}
          className="btn btn--glass btn--small"
          aria-label={`Open ${idea.title}`}
        >
          Open
        </Link>
      </div>
    </li>
  );
}

export function SourcedTraderCard({ trader }: { trader: TraderSummary }) {
  return (
    <li className="tcard lift" data-demo={trader.isDemo}>
      <div className="tcard__head">
        <div className="tcard__who">
          <Link
            to="/profiles/$traderId"
            params={{ traderId: trader.id }}
            className="tcard__link"
          >
            {trader.displayName}
          </Link>
          <p className="tcard__meta">
            {trader.markets.length > 0
              ? trader.markets.join(", ")
              : "Market not stated"}
          </p>
          <p className="tcard__badges">
            {trader.isDemo ? (
              <DemoBadge />
            ) : (
              <span className="badge badge--quiet">Manual coverage</span>
            )}
          </p>
        </div>
      </div>
      <p className="tcard__basis">
        <span className="tcard__meta">
          {PARTICIPATION_LABEL[trader.participation]}
        </span>
      </p>
      <p className="tcard__basis">
        <span className="tcard__meta">
          <span className="num">{trader.ideaCount}</span>{" "}
          {trader.ideaCount === 1 ? "idea" : "ideas"} recorded
        </span>
      </p>
    </li>
  );
}
