import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import {
  formatWhen,
  latestUpdateLabel,
  safeHref,
  sourceHost,
  type FeedItemView,
  type IdeaSummary,
  type RelationshipBasis,
} from "../model";
import type { Stamp } from "../stamps";
import { Avatar } from "./Avatar";
import { SlotFace } from "./Slot";
import { WatchButton } from "./WatchButton";

export type TicketScreen =
  | { kind: "idea"; idea: IdeaSummary }
  | { kind: "detected"; item: FeedItemView };

/** "5m", "3h", "2d", "9 Oct": short enough for a chip; the exact time is in the tooltip. */
export function ago(iso: string | null, now: number): string {
  if (iso === null) return "date unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "date unknown";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  if (s < 14 * 86_400) return `${Math.round(s / 86_400)}d`;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const TRACK: Record<
  RelationshipBasis | "none",
  { caption: string; line: "solid" | "dashed" | "dotted" | "none" }
> = {
  creator_confirmed: { caption: "Author-linked update", line: "solid" },
  editorially_associated: { caption: "Same topic", line: "dashed" },
  uncertain: { caption: "Link unconfirmed", line: "dotted" },
  original: { caption: "Original", line: "none" },
  none: { caption: "No update yet", line: "none" },
};

/**
 * The relationship between an original and its later item, drawn instead of explained: two nodes,
 * joined by a solid line when the author linked them, dashed for the same topic, dotted when
 * Relay could not confirm it, and a lone node when nothing later is recorded.
 */
function Track({ basis }: { basis: RelationshipBasis | null }) {
  const t = TRACK[basis ?? "none"];
  const tip =
    latestUpdateLabel({
      latestUpdate: basis ? { basis, occurredAt: null } : null,
    }) ?? "No later item recorded yet";
  return (
    <div className="track" data-line={t.line} title={tip}>
      <svg viewBox="0 0 240 24" role="img" aria-label={t.caption}>
        <circle className="track__node" cx="14" cy="12" r="7" />
        {t.line !== "none" ? (
          <>
            <line
              className="track__line"
              x1="22"
              y1="12"
              x2="218"
              y2="12"
              pathLength={1}
            />
            <circle
              className="track__node track__node--later"
              cx="226"
              cy="12"
              r="7"
            />
          </>
        ) : (
          <line className="track__stub" x1="26" y1="12" x2="120" y2="12" />
        )}
      </svg>
      <span className="track__caption">{t.caption}</span>
    </div>
  );
}

/**
 * One idea (or one freshly detected post) as a theatre ticket. The top is the playbill: who, what,
 * how it is tied to what came after. The bottom is the stub with three stamp slots that fill as the
 * reader really does each thing: looked at it, opened its source, watched it. Nothing on it
 * claims a trade, a result or a recommendation.
 */
export function Ticket({
  screen,
  active,
  now,
  stamps,
  latestSeq,
  onStamp,
}: {
  screen: TicketScreen;
  active: boolean;
  now: number;
  stamps: readonly Stamp[];
  latestSeq: string | null;
  onStamp: (stamp: Stamp) => void;
}) {
  // Looking at a ticket for a moment stamps "seen"; flicking past it does not.
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
  const peek =
    isIdea && !screen.idea.original.contentRemoved
      ? screen.idea.original.displayedContent
      : null;

  return (
    <div
      className="ticket"
      data-author={person.id}
      data-kind={screen.kind}
      data-active={active}
    >
      <div className="ticket__poster">
        <Link
          to="/profiles/$traderId"
          params={{ traderId: person.id }}
          className="ticket__who"
          title={`${person.displayName} · public-source profile, not claimed by the author`}
        >
          <Avatar
            id={person.id}
            name={person.displayName}
            className="avatar--hero"
          />
          <span className="ticket__name">{person.displayName}</span>
        </Link>

        {!isIdea && (
          <p className="chips">
            <span className="chip chip--new">
              <i aria-hidden="true" /> New
            </span>
            <span
              className="chip chip--quiet"
              title="Found automatically in the author's own feed. Relay has not read it or checked that it is a trading idea."
            >
              Unreviewed
            </span>
          </p>
        )}

        <h2 className="ticket__title">{title}</h2>

        {isIdea && <Track basis={screen.idea.latestUpdate?.basis ?? null} />}

        <div className="chips chips--meta">
          {isIdea && screen.idea.assets.length > 0 && (
            <span className="chip">
              {screen.idea.assets.slice(0, 3).join(" · ")}
            </span>
          )}
          {host && <span className="chip chip--quiet">{host}</span>}
          <span className="chip chip--quiet" title={formatWhen(when)}>
            <Icon name="clock" size={12} /> {ago(when, now)}
          </span>
        </div>

        {peek && (
          <details className="ticket__peek">
            <summary aria-label="What it says">
              <Icon name="details" size={16} />
            </summary>
            <p>{peek}</p>
          </details>
        )}
      </div>

      <div className="ticket__perf" aria-hidden="true" />

      <div className="ticket__stub" role="group" aria-label="Stamps">
        <span
          className="slot slot--auto"
          data-stamped={stamps.includes("seen")}
        >
          <SlotFace
            icon="post"
            label="Seen"
            stamped={stamps.includes("seen")}
          />
        </span>
        {href && (
          <a
            className="slot"
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label="Open the original"
            onClick={() => onStamp("sourced")}
          >
            <SlotFace
              icon="external"
              label="Source"
              stamped={stamps.includes("sourced")}
            />
          </a>
        )}
        <WatchButton
          variant="slot"
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
        {isIdea && (
          <Link
            to="/ideas/$ideaId"
            params={{ ideaId: screen.idea.id }}
            className="slot"
            aria-label="See the timeline"
          >
            <SlotFace icon="chain" label="Story" stamped={false} />
          </Link>
        )}
      </div>
    </div>
  );
}
