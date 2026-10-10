import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Cue, type CuePose } from "../components/cue/Cue";
import { StatusBlock } from "../components/feed/StatusBlock";
import { Portrait } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import {
  DEMO_LABEL,
  DEMO_PLAN,
  DEMO_STEPS,
  demoState,
  type DemoState,
} from "../lib/demo";
import { formatClock, formatDuration, formatUsdText } from "../lib/format";
import { useMounted } from "../lib/mounted";
import { useCalmMotion } from "../lib/motion";
import { useCueGaze, useStagePointer } from "../lib/pointer";
import { STATUS_HEADLINE } from "../lib/status";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Try the demo · Relay" }] }),
  component: Demo,
});

const EASE = [0.16, 1, 0.3, 1] as const;

interface Watched {
  atMs: number;
  state: DemoState;
}

/** Cue's line and pose for each moment of the walkthrough. */
function scene(
  state: DemoState,
  watched: Watched | null,
): {
  pose: CuePose;
  line: string;
} {
  switch (state.entry.status) {
    case "in_range":
      return watched
        ? {
            pose: "saved",
            line: "Saved to this demo's watch list. Nothing was bought. Now move the clock forward and see what changes.",
          }
        : {
            pose: "discover",
            line: `This is Mika's plan: buy SOL between $140 and $145. The price is $${state.price.display}, inside the range. Watch it to keep an eye on it.`,
          };
    case "above_range":
      return {
        pose: "missed",
        line: watched
          ? "The price moved above Mika's original range. Watching saved the plan; it did not place a trade."
          : "The price moved above Mika's original range. Watching would have saved the plan; it would not have placed a trade.",
      };
    default:
      return {
        pose: "bow",
        line: "The entry window has closed. That's the whole demo: no trade, no receipt and no result were created.",
      };
  }
}

function Demo() {
  const reduce = useCalmMotion();
  const mounted = useMounted();
  const [startMs, setStartMs] = useState(() => Date.now());
  const [step, setStep] = useState(0);
  const [watched, setWatched] = useState<Watched | null>(null);
  const pointer = useStagePointer();
  const cueRef = useRef<HTMLDivElement>(null);
  useCueGaze(cueRef, pointer);

  const restart = () => {
    setStartMs(Date.now());
    setStep(0);
    setWatched(null);
  };

  // The simulated clock is local time, so it is only drawn in the browser.
  if (!mounted) {
    return (
      <section
        className="page demo"
        aria-labelledby="demo-title"
        aria-busy="true"
      >
        <DemoBanner />
        <h1 id="demo-title" className="page__title">
          Try the demo
        </h1>
      </section>
    );
  }

  const state = demoState(step, startMs);
  const { pose, line } = scene(state, watched);
  const last = step >= DEMO_STEPS.length - 1;
  const nowSec = Math.floor(state.nowMs / 1000);
  const ended = state.entry.status === "expired";
  const original = watched?.state ?? demoState(0, startMs);

  return (
    <section className="page demo" aria-labelledby="demo-title">
      <DemoBanner />
      <h1 id="demo-title" className="page__title">
        Try the demo
      </h1>
      <p className="page__text">
        Follow one fictional trader from a public idea to a plan, and watch the
        plan until its entry passes. A simulated clock moves only when you press
        the advance button.
      </p>

      <section className="demo__records" aria-labelledby="demo-records-title">
        <h2 id="demo-records-title" className="page__section">
          Mika's records
        </h2>
        <ul className="records">
          <li className="record-row">
            <span className="record-row__top">
              <KindBadge kind="fictional" />
              <KindBadge kind="public_post" />
              <span className="record-row__time">
                {DEMO_PLAN.publishedMinutesBefore + 18} min before the plan
              </span>
            </span>
            <span className="record-row__title">“{DEMO_PLAN.post}”</span>
            <span className="record-row__terms">
              An idea, not proof of a trade. Nothing here says Mika bought.
            </span>
          </li>
          <li className="record-row">
            <span className="record-row__top">
              <KindBadge kind="fictional" />
              <KindBadge kind="relay_plan" />
              <span className="record-row__time">
                {DEMO_PLAN.publishedMinutesBefore} min ago
              </span>
            </span>
            <span className="record-row__title">
              {DEMO_PLAN.pair} · Buy plan
            </span>
            <span className="record-row__terms">
              Entry{" "}
              <span className="num">
                {formatUsdText(DEMO_PLAN.entryLow)} –{" "}
                {formatUsdText(DEMO_PLAN.entryHigh)}
              </span>{" "}
              · the plan below. Real plans are signed on Solana.
            </span>
          </li>
        </ul>
      </section>

      <div className="demo__grid">
        <figure className="demo__cue">
          <div ref={cueRef}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={pose}
                initial={
                  reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }
                }
                transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE }}
              >
                <Cue pose={pose} className="cue--lit" />
              </motion.div>
            </AnimatePresence>
          </div>
          <figcaption className="demo__line" aria-live="polite">
            <span className="demo__speaker">Cue</span>
            {line}
          </figcaption>
        </figure>

        <article className="demo__plan" aria-labelledby="demo-plan-title">
          <div className="demo__cast">
            <Portrait seed={DEMO_PLAN.seed} dim={ended}>
              <p className="portrait__name">{DEMO_PLAN.creator}</p>
            </Portrait>
            <p className="act__byline">
              <span className="badge">{DEMO_PLAN.creatorNote}</span>
            </p>
          </div>
          <header className="act__title">
            <h2 id="demo-plan-title" className="act__pair">
              {DEMO_PLAN.pair}
              <span className="sr-only"> demo plan by {DEMO_PLAN.creator}</span>
            </h2>
            <p className="act__range">
              Buy plan · entry{" "}
              <span className="num">
                {formatUsdText(DEMO_PLAN.entryLow)} –{" "}
                {formatUsdText(DEMO_PLAN.entryHigh)}
              </span>
            </p>
          </header>
          <StatusBlock
            status={state.entry.status}
            closingSoon={state.entry.closingSoon}
            msUntilExpiry={state.entry.msUntilExpiry}
            expiresAt={state.expiresAtSec}
            entryLowUnits={DEMO_PLAN.entryLowUnits.toString()}
            entryHighUnits={DEMO_PLAN.entryHighUnits.toString()}
            entryLow={DEMO_PLAN.entryLow}
            entryHigh={DEMO_PLAN.entryHigh}
            quoteDecimals={DEMO_PLAN.quoteDecimals}
            price={{ units: state.price.units.toString() }}
            priceAgeMs={null}
            headingId="demo-status"
            window={
              <span className="chip">
                <Icon name="clock" size={15} />
                {state.entry.msUntilExpiry > 0 ? (
                  <>
                    Closes{" "}
                    <span className="num">
                      {formatClock(state.expiresAtSec, nowSec)}
                    </span>{" "}
                    · in{" "}
                    <span className="num">
                      {formatDuration(state.entry.msUntilExpiry)}
                    </span>
                  </>
                ) : (
                  <>
                    Window closed{" "}
                    <span className="num">
                      {formatClock(state.expiresAtSec, nowSec)}
                    </span>
                  </>
                )}
              </span>
            }
          />
          <p className="act__rationale">“{DEMO_PLAN.rationale}”</p>
          <p className="demo__evidence">
            <Icon name="unknown" size={15} />
            Demo plan. Real plans show their onchain version and terms hash
            here.
          </p>

          <div className="demo__actions">
            <button
              type="button"
              className="btn btn--glass"
              data-on={watched !== null}
              aria-pressed={watched !== null}
              disabled={ended && watched === null}
              onClick={() =>
                setWatched(watched ? null : { atMs: state.nowMs, state })
              }
            >
              <Icon name={watched ? "star-filled" : "star"} size={18} />
              {watched ? "Watching" : "Watch"}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => (last ? restart() : setStep(step + 1))}
            >
              {last ? "Restart demo" : DEMO_STEPS[step + 1].advanceLabel}
            </button>
          </div>
          <p className="page__text page__text--quiet">
            Following is switched off in the demo. On a real plan you choose an
            amount, get a fresh quote, then approve the trade yourself in your
            wallet.
          </p>
        </article>
      </div>

      {step > 0 && (
        <section className="demo__compare" aria-labelledby="demo-compare-title">
          <h2 id="demo-compare-title" className="page__section">
            {watched ? "Since you watched" : "Original terms and now"}
          </h2>
          <div className="compare">
            <Column
              title={watched ? "When you watched" : "When you arrived"}
              state={original}
              nowSec={nowSec}
            />
            <Column
              title="Now"
              state={state}
              nowSec={nowSec}
              changedFrom={original}
            />
          </div>
          <p className="page__text page__text--quiet">
            The plan's terms did not change. Only the simulated price and clock
            moved.
          </p>
        </section>
      )}

      {last && (
        <div className="demo__finish">
          <Link to="/traders" className="btn btn--primary">
            Explore real traders
          </Link>
          <button type="button" className="btn btn--glass" onClick={restart}>
            Restart demo
          </button>
        </div>
      )}
    </section>
  );
}

function DemoBanner() {
  return (
    <p className="demo-banner" role="note">
      <Icon name="unknown" size={16} />
      {DEMO_LABEL}
    </p>
  );
}

function Column({
  title,
  state,
  nowSec,
  changedFrom,
}: {
  title: string;
  state: DemoState;
  nowSec: number;
  changedFrom?: DemoState;
}) {
  const statusChanged =
    changedFrom && changedFrom.entry.status !== state.entry.status;
  const priceChanged =
    changedFrom && changedFrom.price.units !== state.price.units;
  return (
    <div className="compare__col">
      <h3 className="compare__title">
        {title}{" "}
        <span className="num compare__time">
          {formatClock(Math.floor(state.nowMs / 1000), nowSec)}
        </span>
      </h3>
      <dl className="compare__facts">
        <div>
          <dt>Entry range</dt>
          <dd className="num">
            {formatUsdText(DEMO_PLAN.entryLow)} –{" "}
            {formatUsdText(DEMO_PLAN.entryHigh)}
          </dd>
        </div>
        <div data-changed={priceChanged === true}>
          <dt>Price (simulated)</dt>
          <dd className="num">{formatUsdText(state.price.display)}</dd>
        </div>
        <div data-changed={statusChanged === true}>
          <dt>Status</dt>
          <dd>{STATUS_HEADLINE[state.entry.status]}</dd>
        </div>
      </dl>
    </div>
  );
}
