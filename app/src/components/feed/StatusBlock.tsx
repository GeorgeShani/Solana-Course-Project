import type { EntryStatus } from "@relay/domain";
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
 * The entry status: icon, words and shape together, never color alone. The data sits on a flat
 * surface; no glow or gradient behind numbers.
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
}) {
  const copy = { status, closingSoon, msUntilExpiry, expiresAt, priceAgeMs };
  const priceUnits = price ? BigInt(price.units) : null;
  const tone = STATUS_TONE[status];
  return (
    <section className="status" data-tone={tone} aria-labelledby={headingId}>
      <div className="status__head">
        <Icon name={STATUS_ICON[status]} size={24} className="status__icon" />
        <h3 id={headingId} className="status__headline">
          {statusHeadline(copy)}
          {status === "in_range" && closingSoon && (
            <Icon name="clock" size={18} className="status__clock" />
          )}
        </h3>
      </div>
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
            Now <span className="num">{formatUsd(priceUnits, quoteDecimals)}</span>
            {priceAgeMs !== null && <> · updated {formatAge(priceAgeMs)}</>}
          </>
        )}
      </p>
      <p className="status__hint">{statusHint(copy)}</p>
    </section>
  );
}
