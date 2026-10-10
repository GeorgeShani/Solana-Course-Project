import type { EntryStatus } from "@relay/domain";
import type { ReactNode } from "react";
import { formatAge, formatUsd, formatUsdText } from "../../lib/format";
import { STATUS_TONE, statusHeadline, statusHint } from "../../lib/status";
import { Icon, type IconName } from "../ui/Icon";
import { RangeBar } from "./RangeBar";

const STATUS_ICON: Record<EntryStatus, IconName> = {
  in_range: "in-range",
  above_range: "above",
  below_range: "below",
  expired: "expired",
  closed: "closed",
  price_stale: "unknown",
  price_unavailable: "unknown",
};

/**
 * The programme plaque: the entry status as icon, words and pill shape together (filled only for
 * "In plan range", outlined otherwise, dashed when the price is unknown), never color alone. The
 * plaque is flat velvet; no glow or gradient sits behind numbers.
 */
export function StatusBlock({
  status,
  closingSoon,
  msUntilExpiry,
  expiresAt,
  entryLowUnits,
  entryHighUnits,
  entryLow,
  entryHigh,
  quoteDecimals,
  price,
  priceAgeMs,
  headingId,
  window,
}: {
  status: EntryStatus;
  closingSoon: boolean;
  msUntilExpiry: number;
  expiresAt: number;
  entryLowUnits: string;
  entryHighUnits: string;
  entryLow: string;
  entryHigh: string;
  quoteDecimals: number;
  price: { units: string } | null;
  priceAgeMs: number | null;
  headingId: string;
  /** The entry-window pill, shown beside the status like curtain-sol's badge and countdown. */
  window: ReactNode;
}) {
  const copy = { status, closingSoon, msUntilExpiry, expiresAt, priceAgeMs };
  const priceUnits = price ? BigInt(price.units) : null;
  return (
    <section
      className="status"
      data-tone={STATUS_TONE[status]}
      aria-labelledby={headingId}
    >
      <div className="status__head">
        <h3 id={headingId} className="status__pill">
          <Icon name={STATUS_ICON[status]} size={20} className="status__icon" />
          {statusHeadline(copy)}
        </h3>
        {window}
      </div>
      <p className="status__hint">{statusHint(copy)}</p>
      <RangeBar
        low={BigInt(entryLowUnits)}
        high={BigInt(entryHighUnits)}
        price={priceUnits}
        lowLabel={formatUsdText(entryLow)}
        highLabel={formatUsdText(entryHigh)}
      />
      <p className="status__price">
        {priceUnits === null ? (
          "No current price"
        ) : (
          <>
            Now{" "}
            <span className="num status__now">
              {formatUsd(priceUnits, quoteDecimals)}
            </span>
            {priceAgeMs !== null && <> · updated {formatAge(priceAgeMs)}</>}
          </>
        )}
      </p>
    </section>
  );
}
