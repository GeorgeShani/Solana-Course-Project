import type { EntryStatusResult } from "@relay/domain";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type MouseEvent } from "react";
import {
  fetchPlanVersions,
  type PlanCardView,
  type VersionView,
} from "../../lib/api";
import { API_URL } from "../../lib/config";
import {
  formatAge,
  formatClock,
  formatUsd,
  formatUsdText,
  shortAddress,
  shortHash,
} from "../../lib/format";
import { stageName } from "../../lib/labels";
import { statusHeadline } from "../../lib/status";
import { Cue } from "../cue/Cue";
import { Avatar } from "../theatre/Portrait";
import { Icon } from "../ui/Icon";

/** What moved between two committed versions, in the plan's own terms. */
function changes(prev: VersionView, next: VersionView): string {
  const out: string[] = [];
  if (
    prev.entryLowUnits !== next.entryLowUnits ||
    prev.entryHighUnits !== next.entryHighUnits
  )
    out.push("entry range changed");
  if (prev.expiresAt !== next.expiresAt)
    out.push(
      next.expiresAt > prev.expiresAt ? "window extended" : "window shortened",
    );
  if (prev.contentHash !== next.contentHash) out.push("text changed");
  return out.length ? out.join(" · ") : "no term changes";
}

function History({ planPda, nowSec }: { planPda: string; nowSec: number }) {
  const q = useQuery({
    queryKey: ["plan-versions", planPda],
    queryFn: () => fetchPlanVersions(API_URL, planPda),
    staleTime: 30_000,
    retry: 1,
  });
  if (q.isPending)
    return (
      <p className="script__quiet" aria-busy="true">
        Loading version history…
      </p>
    );
  if (q.isError) {
    return (
      <div className="script__error" role="status">
        <p>Couldn't load the version history. {q.error.message}.</p>
        <button
          type="button"
          className="btn btn--glass btn--small"
          onClick={() => void q.refetch()}
        >
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </div>
    );
  }
  const versions = [...q.data].reverse();
  return (
    <ol className="script__history">
      {versions.map((v, i) => {
        const prev = versions[i + 1];
        return (
          <li key={v.versionPda}>
            <p className="script__history-head">
              <strong>Version {v.version}</strong> · published{" "}
              <span className="num">{formatClock(v.publishedAt, nowSec)}</span>
            </p>
            <p className="script__quiet">
              Entry{" "}
              <span className="num">
                {formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}
              </span>{" "}
              · window until{" "}
              <span className="num">{formatClock(v.expiresAt, nowSec)}</span>
            </p>
            <p className="script__quiet">
              {prev ? changes(prev, v) : "first version"} · terms{" "}
              <span className="num">{shortHash(v.termsHash)}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Layer 2 of a plan, from the curtain-sol script sheet: a bottom sheet on phones and a centred
 * sheet on desktop, built on the native modal dialog for focus, Escape and the backdrop.
 */
export function ScriptSheet({
  card,
  live,
  nowMs,
  onClose,
}: {
  card: PlanCardView | null;
  live: EntryStatusResult | null;
  nowMs: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = card !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  };

  const v = card?.version;
  const nowSec = Math.floor(nowMs / 1000);
  return (
    <dialog
      ref={ref}
      className="script"
      aria-labelledby="script-title"
      onClose={onClose}
      onClick={onBackdrop}
    >
      {card && v && (
        <div className="script__body">
          <span className="script__handle" aria-hidden="true" />
          <header className="script__head">
            <Avatar seed={card.creator.address} size={44} />
            <div className="script__who">
              <h2 id="script-title" className="script__title">
                {card.pair.label} · Buy plan
              </h2>
              <p className="script__byline">
                <span>
                  {stageName(card)}
                  {card.creator.handle && <> · @{card.creator.handle}</>}
                </span>
                {card.fictionalPreview ? (
                  <span className="badge">Fictional preview</span>
                ) : (
                  card.creator.isDemo && (
                    <span className="badge">Demo creator</span>
                  )
                )}
              </p>
            </div>
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Close plan"
              onClick={() => ref.current?.close()}
            >
              <Icon name="close" size={22} />
            </button>
          </header>

          {live?.status === "above_range" && (
            <aside className="script__callout" aria-labelledby="script-missed">
              <Cue pose="missed" className="script__callout-cue" />
              <div>
                <h3 id="script-missed">The original entry passed</h3>
                <p>
                  The price moved above {stageName(card)}'s range. Following now
                  would not match the plan. Watching keeps it in your Watchlist;
                  it never places a trade.
                </p>
              </div>
            </aside>
          )}

          <dl className="script__terms">
            <div>
              <dt>Entry status</dt>
              <dd>
                {live
                  ? statusHeadline({
                      ...live,
                      expiresAt: v.expiresAt,
                      priceAgeMs: null,
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Entry range</dt>
              <dd className="num">
                {formatUsdText(v.entryLow)} – {formatUsdText(v.entryHigh)}
              </dd>
            </div>
            <div>
              <dt>Now</dt>
              <dd>
                {card.entry.price ? (
                  <>
                    <span className="num">
                      {formatUsd(
                        BigInt(card.entry.price.units),
                        card.pair.quoteDecimals,
                      )}
                    </span>{" "}
                    <span className="script__quiet">
                      · updated{" "}
                      {formatAge(
                        Math.max(0, nowMs - card.entry.price.observedAtMs),
                      )}
                    </span>
                  </>
                ) : (
                  "No current price"
                )}
              </dd>
            </div>
            {v.text?.refPrice && (
              <div>
                <dt>At publish</dt>
                <dd>
                  <span className="num">
                    {formatUsdText(v.text.refPrice.display)}
                  </span>{" "}
                  <span className="script__quiet">
                    ({v.text.refPrice.source})
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt>Entry window</dt>
              <dd>
                {card.planStatus === "closed"
                  ? "Closed by creator · was until "
                  : "Until "}
                <span className="num">{formatClock(v.expiresAt, nowSec)}</span>
              </dd>
            </div>
          </dl>

          {v.text ? (
            <>
              <section className="script__section" aria-labelledby="script-why">
                <h3 id="script-why">Why</h3>
                <p>{v.text.rationale}</p>
              </section>
              <section
                className="script__section"
                aria-labelledby="script-exit"
              >
                <h3 id="script-exit">Exit idea</h3>
                <p>{v.text.exitThesis}</p>
                {(v.text.exitTarget || v.text.invalidation) && (
                  <p className="script__quiet">
                    {v.text.exitTarget && (
                      <>
                        Target{" "}
                        <span className="num">
                          {formatUsdText(v.text.exitTarget)}
                        </span>
                      </>
                    )}
                    {v.text.exitTarget && v.text.invalidation && " · "}
                    {v.text.invalidation && (
                      <>
                        Invalid under{" "}
                        <span className="num">
                          {formatUsdText(v.text.invalidation)}
                        </span>
                      </>
                    )}
                  </p>
                )}
                <p className="script__note">
                  An exit idea is not a stop-loss order. Nothing is sold for
                  you.
                </p>
              </section>
            </>
          ) : (
            <p className="script__quiet">
              Version {v.version} is committed onchain, but its text isn't
              available.
            </p>
          )}

          <section className="script__section" aria-labelledby="script-follow">
            <h3 id="script-follow">Following this plan</h3>
            <ol className="script__steps">
              <li>Choose how much to spend.</li>
              <li>
                Get a fresh quote, checked against the plan's entry range and
                window.
              </li>
              <li>Connect your wallet.</li>
              <li>Approve the trade yourself. Relay never trades for you.</li>
            </ol>
            <p className="script__note">
              {live && (live.status === "expired" || live.status === "closed")
                ? "This plan's entry window has ended, so it can't be followed."
                : "Reviewing and approving a trade isn't available in this build yet, so nothing here can be signed."}
            </p>
          </section>

          {card.fictionalPreview ? (
            <p className="evidence" data-kind="fictional">
              <Icon name="alert" size={15} />
              Fictional preview — no onchain record, no version history
            </p>
          ) : (
            <>
              <section
                className="script__section"
                aria-labelledby="script-history"
              >
                <h3 id="script-history">Version history</h3>
                <History planPda={card.planPda} nowSec={nowSec} />
              </section>
              <section
                className="script__section"
                aria-labelledby="script-record"
              >
                <h3 id="script-record">Onchain record</h3>
                <dl className="script__record">
                  <div>
                    <dt>Plan</dt>
                    <dd className="num" title={card.planPda}>
                      {shortAddress(card.planPda)}
                    </dd>
                  </div>
                  <div>
                    <dt>Version {v.version}</dt>
                    <dd className="num" title={v.versionPda}>
                      {shortAddress(v.versionPda)}
                    </dd>
                  </div>
                  <div>
                    <dt>Terms hash</dt>
                    <dd className="num" title={v.termsHash}>
                      {shortHash(v.termsHash)}
                    </dd>
                  </div>
                  <div>
                    <dt>Content hash</dt>
                    <dd className="num" title={v.contentHash}>
                      {shortHash(v.contentHash)}
                      {v.text && " · text matches"}
                    </dd>
                  </div>
                </dl>
                <p className="script__quiet">
                  Follower results aren't shown here yet.
                </p>
              </section>
              <p className="script__links">
                <Link
                  to="/records/$planPda"
                  params={{ planPda: card.planPda }}
                  className="btn btn--glass btn--small"
                >
                  Full record
                </Link>
                <Link
                  to="/traders/$address"
                  params={{ address: card.creator.address }}
                  className="btn btn--glass btn--small"
                >
                  Trader profile
                </Link>
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
