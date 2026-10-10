import type { EntryStatusResult } from "@relay/domain";
import { useState, type Ref } from "react";
import type { PlanCardView } from "../../lib/api";
import { formatAge, formatClock, formatDuration, formatUsdText } from "../../lib/format";
import { creatorName, planLabel } from "../../lib/labels";
import { Sigil } from "../theatre/Sigil";
import { Icon } from "../ui/Icon";
import { ActionRow } from "./ActionRow";
import { EvidenceLine } from "./EvidenceLine";
import { StatusBlock } from "./StatusBlock";

/**
 * One act on the stage: Layer 1 of a plan, readable in a few seconds. Visual weight runs status,
 * then pair, then creator, then rationale.
 */
export function PlanCard({
  card,
  live,
  nowMs,
  clockSkewed,
  index,
  total,
  active,
  offline,
  watching,
  onToggleWatch,
  articleRef,
}: {
  card: PlanCardView;
  live: EntryStatusResult;
  nowMs: number;
  clockSkewed: boolean;
  index: number;
  total: number;
  active: boolean;
  offline: boolean;
  watching: boolean;
  onToggleWatch: () => void;
  articleRef: Ref<HTMLElement>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const id = `plan-${card.planPda}`;
  const v = card.version;
  const nowSec = Math.floor(nowMs / 1000);
  const publishedAgo = Math.max(0, nowMs - v.publishedAt * 1000);
  const priceAgeMs = card.entry.price ? Math.max(0, nowMs - card.entry.price.observedAtMs) : null;
  const isDemo = card.creator.isDemo || card.fictionalPreview === true;

  return (
    <article
      ref={articleRef}
      className="act"
      data-active={active}
      data-offline={offline}
      data-plan={card.planPda}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-status`}
      aria-posinset={index + 1}
      aria-setsize={total}
      tabIndex={0}
    >
      <div className="act__panel">
        <header className="act__byline">
          <Sigil seed={card.creator.address} size={40} />
          <div className="act__who">
            <p className="act__name">{creatorName(card)}</p>
            <p className="act__meta">
              {card.creator.handle && <>@{card.creator.handle} · </>}
              {card.versionCount > 1 ? (
                <span className="act__updated">
                  <Icon name="updated" size={14} />
                  v{v.version} updated {formatAge(publishedAgo)}
                </span>
              ) : (
                <span className="act__age">
                  v{v.version} · {formatAge(publishedAgo)}
                </span>
              )}
            </p>
          </div>
          {card.fictionalPreview ? (
            <span className="badge badge--fictional">
              Fictional<span className="badge__more"> preview</span>
            </span>
          ) : (
            isDemo && <span className="badge badge--fictional">Fictional</span>
          )}
        </header>

        <div className="act__title">
          <h2 id={`${id}-title`} className="act__pair">
            {card.pair.label}
          </h2>
          <span className="act__side">Buy plan</span>
        </div>
        <p className="act__range">
          Entry <span className="num">{formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}</span>
        </p>

        <div id={`${id}-status`}>
          <StatusBlock
            status={live.status}
            closingSoon={live.closingSoon}
            msUntilExpiry={live.msUntilExpiry}
            expiresAt={v.expiresAt}
            entryLowUnits={v.entryLowUnits}
            entryHighUnits={v.entryHighUnits}
            entryLow={v.entryLow}
            entryHigh={v.entryHigh}
            quoteDecimals={card.pair.quoteDecimals}
            price={card.entry.price}
            priceAgeMs={priceAgeMs}
            headingId={`${id}-headline`}
          />
        </div>

        <p className="act__window">
          <Icon name="clock" size={16} />
          {live.status === "closed" ? (
            <>
              No new entries · window was until <span className="num">{formatClock(v.expiresAt, nowSec)}</span>
            </>
          ) : live.msUntilExpiry > 0 ? (
            <>
              Window closes <span className="num">{formatClock(v.expiresAt, nowSec)}</span> (in{" "}
              {formatDuration(live.msUntilExpiry)})
            </>
          ) : (
            <>
              Window closed <span className="num">{formatClock(v.expiresAt, nowSec)}</span>
            </>
          )}
          {clockSkewed && <span className="act__chainclock">chain clock</span>}
        </p>

        <div id={`${id}-details`} className="act__text" data-open={detailsOpen}>
          {v.text ? (
            <>
              <p className="act__rationale">{v.text.rationale}</p>
              {detailsOpen && (
                <>
                <dl className="act__more">
                  <div>
                    <dt>Exit thesis</dt>
                    <dd>{v.text.exitThesis}</dd>
                  </div>
                  {v.text.exitTarget && (
                    <div>
                      <dt>Exit target</dt>
                      <dd className="num">{formatUsdText(v.text.exitTarget)}</dd>
                    </div>
                  )}
                  {v.text.invalidation && (
                    <div>
                      <dt>Invalidation</dt>
                      <dd className="num">{formatUsdText(v.text.invalidation)}</dd>
                    </div>
                  )}
                </dl>
                <p className="act__note">An exit thesis is not a stop-loss order. Nothing is sold for you.</p>
                </>
              )}
            </>
          ) : (
            <p className="act__rationale act__rationale--missing">
              {card.fictionalPreview
                ? "Plan text unavailable"
                : `Version ${v.version} committed onchain · text unavailable`}
            </p>
          )}
        </div>

        <EvidenceLine
          version={v.version}
          termsHash={v.termsHash}
          textVerified={v.text !== null}
          fictionalPreview={card.fictionalPreview === true}
        />

        <ActionRow
          status={live.status}
          watching={watching}
          onToggleWatch={onToggleWatch}
          detailsOpen={detailsOpen}
          detailsAvailable={v.text !== null}
          onToggleDetails={() => setDetailsOpen((o) => !o)}
          detailsId={`${id}-details`}
          label={planLabel(card)}
        />
      </div>
    </article>
  );
}
