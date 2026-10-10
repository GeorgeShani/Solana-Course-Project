import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DemoBadge } from "../components/discovery/Cards";
import {
  EvidencePanel,
  type AskTarget,
} from "../components/discovery/EvidencePanel";
import { SourceCard } from "../components/discovery/SourceCard";
import { Timeline } from "../components/discovery/Timeline";
import { WatchButton } from "../components/discovery/WatchButton";
import { Cue } from "../components/cue/Cue";
import { BackLink } from "../components/ui/BackLink";
import { Icon } from "../components/ui/Icon";
import { DiscoveryNotFoundError } from "../lib/discovery";
import { useIdea } from "../lib/discovery-queries";
import {
  markSeen,
  seqGreater,
  useDiscoveryWatch,
} from "../lib/discovery-watch";

export const Route = createFileRoute("/ideas/$ideaId")({
  head: () => ({ meta: [{ title: "Idea · Relay" }] }),
  component: IdeaPage,
});

function IdeaPage() {
  const { ideaId } = Route.useParams();
  // Keyed, so moving between ideas starts with a fresh "what had I seen" cursor.
  return <IdeaView key={ideaId} ideaId={ideaId} />;
}

function IdeaView({ ideaId }: { ideaId: string }) {
  const q = useIdea(ideaId);
  const watched = useDiscoveryWatch();
  const [target, setTarget] = useState<AskTarget>({ eventId: null, tick: 0 });

  // What the reader had seen when they opened this page, so new entries stay marked on screen
  // after the cursor moves.
  const openedAfter = useRef<string | null>(null);
  const idea = q.data;
  const entry = watched.find((w) => w.type === "idea" && w.id === ideaId);

  useEffect(() => {
    if (!idea || !entry) return;
    if (openedAfter.current === null) openedAfter.current = entry.after;
    // Opening the idea is how the reader sees its whole timeline, so only now does it count as read.
    markSeen("idea", idea.id, idea.latestSeq);
  }, [idea, entry]);

  const isNew = (seq: string) =>
    openedAfter.current !== null && seqGreater(seq, openedAfter.current);

  if (q.isPending)
    return (
      <section className="page page--wide" aria-busy="true" data-cursor-zone>
        <BackLink fallback="/ideas" label="Ideas" />
        <p className="page__text">Loading the idea…</p>
      </section>
    );

  if (q.isError)
    return (
      <section className="page page--wide" data-cursor-zone>
        <BackLink fallback="/ideas" label="Ideas" />
        {q.error instanceof DiscoveryNotFoundError ? (
          <div className="notice" role="status">
            <Cue pose="unavailable" className="notice__cue" />
            <div className="notice__body">
              <p className="notice__title">Relay has no such idea</p>
              <p className="page__text">
                It may have been removed, or the link may be wrong.
              </p>
              <Link to="/ideas" className="btn btn--glass btn--small">
                See all ideas
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

  const data = q.data;
  const label = `${data.title} · ${data.trader.displayName}`;
  return (
    <article
      className="page page--wide idea"
      aria-labelledby="idea-title"
      data-cursor-zone
    >
      <BackLink fallback="/ideas" label="Ideas" />
      <header className="idea__head">
        <p className="icard__badges">
          {data.isDemo && <DemoBadge />}
          <span className="badge badge--quiet">Manual coverage</span>
        </p>
        <h1 id="idea-title" className="page__title">
          {data.title}
        </h1>
        <p className="idea__by">
          <Link to="/profiles/$traderId" params={{ traderId: data.trader.id }}>
            {data.trader.displayName}
          </Link>
          {data.assets.length > 0 && <span>{data.assets.join(", ")}</span>}
        </p>
        <WatchButton
          type="idea"
          id={data.id}
          label={label}
          seenSeq={data.latestSeq}
        />
      </header>

      <section aria-labelledby="stated-title" className="idea__stated">
        <h2 id="stated-title" className="page__subsection">
          What the original says
        </h2>
        <p className="page__text">
          {data.statedConditions ??
            "The original states no entry or exit conditions."}
        </p>
      </section>

      <SourceCard source={data.original} />

      <section aria-labelledby="timeline-title" className="idea__timeline">
        <h2 id="timeline-title" className="page__subsection">
          Timeline
        </h2>
        <p
          className="idea__chain"
          data-ok={data.chain.verified}
          role={data.chain.verified ? undefined : "alert"}
        >
          <Icon name={data.chain.verified ? "shield" : "alert"} size={14} />
          {data.chain.verified
            ? `Relay's record of this timeline is intact: ${data.chain.checkedEvents} ${
                data.chain.checkedEvents === 1 ? "entry links" : "entries link"
              } up in order. This checks Relay's own record, not whether a claim is true.`
            : "Relay's record of this timeline does not check out. Treat the entries below as unverified."}
        </p>
        <Timeline
          events={data.events}
          requests={data.evidenceRequests}
          onAsk={(eventId) => setTarget((t) => ({ eventId, tick: t.tick + 1 }))}
          highlight={(e) => isNew(e.seq)}
        />
      </section>

      <EvidencePanel
        ideaId={data.id}
        events={data.events}
        publicRequests={data.evidenceRequests}
        target={target}
      />

      <p className="page__text page__text--quiet">
        Not financial advice. Relay records what was said and what evidence
        exists. It does not say an idea was right or wrong, and it does not
        recommend one.
      </p>
    </article>
  );
}
