import { Link } from "@tanstack/react-router";
import { KindBadge } from "../ui/KindBadge";
import {
  PARTICIPATION_LABEL,
  formatWhen,
  type IdeaSummary,
  type TraderSummary,
} from "../../lib/discovery";

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
  const updates = Math.max(0, idea.eventCount - 1);
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
          {idea.original.publishedAt === null
            ? "Original: publication time unknown"
            : `Original: published ${formatWhen(idea.original.publishedAt)}`}
        </span>
        <span>
          {updates === 0
            ? "No later entries yet"
            : `${updates} later ${updates === 1 ? "entry" : "entries"}`}
        </span>
      </p>
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
