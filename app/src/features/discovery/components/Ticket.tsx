import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import {
  formatWhen,
  safeHref,
  sourceHost,
  type FeedItemView,
  type IdeaSummary,
  type RelationshipBasis,
} from "../model";
import type { Stamp } from "../stamps";
import { Avatar } from "./Avatar";
import { WatchButton } from "./WatchButton";

export type TicketScreen =
  | { kind: "idea"; idea: IdeaSummary }
  | { kind: "detected"; item: FeedItemView };

/** "7 Oct 2026" in UTC, or null when the source gives no date. The exact time is in the tooltip. */
export function shortDate(iso: string | null): string | null {
  if (iso === null) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const UPDATE_LABEL: Record<RelationshipBasis, string> = {
  creator_confirmed: "Update from the author",
  editorially_associated: "Later analysis, same topic",
  uncertain: "Later item, link not established",
  original: "Original",
};

/** What the recorded history says, in words: never a verdict, never an invented link. */
function updateStatus(idea: IdeaSummary): {
  text: string;
  tone: "none" | "linked" | "related" | "unsure";
} {
  const u = idea.latestUpdate;
  if (u === null) return { text: "No later update recorded", tone: "none" };
  const when = shortDate(u.occurredAt);
  const label = UPDATE_LABEL[u.basis];
  return {
    text: when ? `${label} · ${when}` : label,
    tone:
      u.basis === "creator_confirmed"
        ? "linked"
        : u.basis === "editorially_associated"
          ? "related"
          : "unsure",
  };
}

/**
 * One idea (or one freshly detected post) as a card: who said it, what it is, where it came from,
 * when, and what is recorded since, then the three things a reader can do. Nothing on it claims a
 * trade, a result or a recommendation.
 */
export function Ticket({
  screen,
  active,
  stamps,
  latestSeq,
  onStamp,
}: {
  screen: TicketScreen;
  active: boolean;
  stamps: readonly Stamp[];
  latestSeq: string | null;
  onStamp: (stamp: Stamp) => void;
}) {
  // Looking at a card for a moment marks it seen; flicking past it does not.
  useEffect(() => {
    if (!active || stamps.includes("seen")) return;
    const t = window.setTimeout(() => onStamp("seen"), 900);
    return () => window.clearTimeout(t);
  }, [active, stamps, onStamp]);

  const isIdea = screen.kind === "idea";
  const person = isIdea ? screen.idea.trader : screen.item.trader;
  const title = isIdea ? screen.idea.title : screen.item.title;
  const url = isIdea ? screen.idea.original.url : screen.item.url;
  const when = isIdea
    ? screen.idea.original.publishedAt
    : screen.item.publishedAt;
  const href = safeHref(url);
  const host = sourceHost(url);
  const date = shortDate(when);
  const summary = isIdea
    ? screen.idea.original.contentRemoved
      ? null
      : screen.idea.original.displayedContent
    : "Found automatically in the author’s own feed. Relay has not reviewed it.";
  const status = isIdea ? updateStatus(screen.idea) : null;
  const assets = isIdea ? screen.idea.assets.slice(0, 3) : [];

  return (
    <div
      className="card"
      data-author={person.id}
      data-kind={screen.kind}
      data-active={active}
    >
      <header className="card__head">
        <Link
          to="/profiles/$traderId"
          params={{ traderId: person.id }}
          className="card__who"
          title="Public-source profile, not claimed by the author"
        >
          <Avatar
            id={person.id}
            name={person.displayName}
            className="avatar--card"
          />
          <span className="card__name">{person.displayName}</span>
        </Link>
        {assets.length > 0 && (
          <span className="chip" title="What the idea is about">
            {assets.join(" · ")}
          </span>
        )}
      </header>

      <h2 className="card__title">{title}</h2>
      {summary && <p className="card__summary">{summary}</p>}

      <dl className="card__facts">
        {host && (
          <div>
            <dt>Source</dt>
            <dd>{host}</dd>
          </div>
        )}
        <div>
          <dt>Published</dt>
          <dd title={formatWhen(when)}>{date ?? "Date unknown"}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd data-tone={isIdea ? "none" : "new"}>
            {isIdea ? "Recorded by hand" : "New · not reviewed"}
          </dd>
        </div>
        {status && (
          <div>
            <dt>Updates</dt>
            <dd data-tone={status.tone}>{status.text}</dd>
          </div>
        )}
      </dl>

      <div className="card__actions">
        {isIdea && (
          <Link
            to="/ideas/$ideaId"
            params={{ ideaId: screen.idea.id }}
            className="btn btn--primary"
          >
            Open story
          </Link>
        )}
        {href && (
          <a
            className={isIdea ? "btn btn--glass" : "btn btn--primary"}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => onStamp("sourced")}
          >
            Open source
            <Icon name="external" size={16} />
          </a>
        )}
        <WatchButton
          variant="card"
          onWatched={() => onStamp("watched")}
          type={isIdea ? "idea" : "trader"}
          id={isIdea ? screen.idea.id : screen.item.trader.id}
          label={
            isIdea
              ? `${screen.idea.title} · ${screen.idea.trader.displayName}`
              : screen.item.trader.displayName
          }
          seenSeq={isIdea ? screen.idea.latestSeq : latestSeq}
        />
        {stamps.includes("seen") && (
          <span className="card__seen">
            <Icon name="in-range" size={14} />
            Seen
          </span>
        )}
      </div>
    </div>
  );
}
