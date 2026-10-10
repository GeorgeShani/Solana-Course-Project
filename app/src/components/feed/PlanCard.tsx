import type { EntryStatusResult } from "@relay/domain";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Ref } from "react";
import type { PlanCardView } from "../../lib/api";
import {
  formatAge,
  formatClock,
  formatDuration,
  formatUsdText,
  shortAddress,
} from "../../lib/format";
import { creatorName, planLabel, stageName } from "../../lib/labels";
import { Portrait } from "../theatre/Portrait";
import { Icon } from "../ui/Icon";
import { KindBadge } from "../ui/KindBadge";
import { ActionRow } from "./ActionRow";
import { EvidenceLine } from "./EvidenceLine";
import { StatusBlock } from "./StatusBlock";
import { useCalmMotion } from "../../lib/motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One act on the stage: Layer 1 of a plan, readable in a few seconds. The portrait and name plate
 * step into the light when the act becomes active; the plan's numbers never move.
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
  onOpenScript,
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
  onOpenScript: () => void;
  articleRef: Ref<HTMLElement>;
}) {
  const reduce = useCalmMotion();
  const id = `plan-${card.planPda}`;
  const v = card.version;
  const nowSec = Math.floor(nowMs / 1000);
  const publishedAgo = Math.max(0, nowMs - v.publishedAt * 1000);
  const priceAgeMs = card.entry.price
    ? Math.max(0, nowMs - card.entry.price.observedAtMs)
    : null;
  const ended = live.status === "expired" || live.status === "closed";

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
      <div className="act__cast">
        <motion.div
          className="act__portrait"
          initial={false}
          animate={
            reduce || active
              ? { y: 0, opacity: 1, scale: 1 }
              : { y: 18, opacity: 0.55, scale: 0.96 }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.9, ease: EASE, delay: active ? 0.15 : 0 }
          }
        >
          <Portrait seed={card.creator.address} dim={ended}>
            <p className="portrait__name">{stageName(card)}</p>
          </Portrait>
        </motion.div>
        <p className="act__byline">
          {card.fictionalPreview ? (
            <>
              {card.creator.handle && (
                <span className="act__handle">@{card.creator.handle}</span>
              )}
              <span className="badge">Fictional preview</span>
            </>
          ) : (
            <>
              <Link
                to="/traders/$address"
                params={{ address: card.creator.address }}
                className="act__trader"
                aria-label={`Trader profile: ${creatorName(card)}`}
              >
                {card.creator.handle
                  ? `@${card.creator.handle}`
                  : shortAddress(card.creator.address)}
              </Link>
              {card.creator.isDemo && (
                <span className="badge">Demo creator</span>
              )}
            </>
          )}
        </p>
        <p className="act__version">
          <KindBadge
            kind={card.fictionalPreview ? "fictional" : "relay_plan"}
          />
          {card.versionCount > 1 ? (
            <>
              <Icon name="updated" size={14} />
              Version {v.version} · updated {formatAge(publishedAgo)}
            </>
          ) : (
            <>Published {formatAge(publishedAgo)}</>
          )}
        </p>
      </div>

      <div className="act__programme">
        <header className="act__title">
          <h2 id={`${id}-title`} className="act__pair">
            {card.pair.label}
            <span className="sr-only"> plan by {creatorName(card)}</span>
          </h2>
          <p className="act__range">
            Buy plan · entry{" "}
            <span className="num">
              {formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}
            </span>
          </p>
        </header>

        <div id={`${id}-status`} className="act__status">
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
            window={
              <>
                <span className="chip">
                  <Icon name="clock" size={15} />
                  {live.status === "closed" ? (
                    <>
                      Window was until{" "}
                      <span className="num">
                        {formatClock(v.expiresAt, nowSec)}
                      </span>
                    </>
                  ) : live.msUntilExpiry > 0 ? (
                    <>
                      Closes{" "}
                      <span className="num">
                        {formatClock(v.expiresAt, nowSec)}
                      </span>{" "}
                      · in{" "}
                      <span className="num">
                        {formatDuration(live.msUntilExpiry)}
                      </span>
                    </>
                  ) : (
                    <>
                      Window closed{" "}
                      <span className="num">
                        {formatClock(v.expiresAt, nowSec)}
                      </span>
                    </>
                  )}
                </span>
                {clockSkewed && (
                  <span className="chip chip--quiet">chain clock</span>
                )}
              </>
            }
          />
        </div>

        {v.text ? (
          <p className="act__rationale">“{v.text.rationale}”</p>
        ) : (
          <p className="act__rationale act__rationale--missing">
            {card.fictionalPreview
              ? "Plan text unavailable"
              : `Version ${v.version} committed onchain · text unavailable`}
          </p>
        )}

        <EvidenceLine
          version={v.version}
          termsHash={v.termsHash}
          textVerified={v.text !== null}
          fictionalPreview={card.fictionalPreview === true}
        />

        <ActionRow
          planPda={card.fictionalPreview ? null : card.planPda}
          status={live.status}
          watching={watching}
          onToggleWatch={onToggleWatch}
          onOpenScript={onOpenScript}
          reviewId={`${id}-review`}
          label={planLabel(card)}
        />
      </div>
    </article>
  );
}
