import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Cue, type CuePose } from "../components/cue/Cue";
import { Avatar } from "../components/theatre/Portrait";
import { Icon } from "../components/ui/Icon";
import { KindBadge } from "../components/ui/KindBadge";
import { PairIcon } from "../components/ui/TokenIcon";
import { cueReact } from "../lib/cue-cursor";
import { DEMO_PLAN } from "../lib/demo";
import { useCalmMotion } from "../lib/motion";
import { RECORD_KIND, type RecordKind } from "../lib/record-kind";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "How it works · Relay" }] }),
  component: HowItWorks,
});

interface Scene {
  id: string;
  step: string;
  title: string;
  line: string;
  pose: CuePose;
  Stage: () => ReactNode;
}

const SCENES: readonly Scene[] = [
  {
    id: "discover",
    step: "Discover",
    title: "Discover a trader",
    line: "Each trader shows what kind of record they have and where it came from.",
    pose: "discover",
    Stage: TraderStage,
  },
  {
    id: "watch",
    step: "Watch",
    title: "Watch an idea",
    line: "Watch a plan to keep its range and window in view. Watching never trades.",
    pose: "saved",
    Stage: WatchStage,
  },
  {
    id: "check",
    step: "Check",
    title: "Inspect the source",
    line: "Open any record to see its kind, source and time. A post never proves a trade.",
    pose: "bow",
    Stage: EvidenceStage,
  },
];

function HowItWorks() {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const calm = useCalmMotion();
  const focusNext = useRef(false);
  const scene = SCENES[at];
  const last = at === SCENES.length - 1;

  // The incoming scene mounts only after the outgoing one has left, so focus waits for its title.
  const heading = (el: HTMLHeadingElement | null) => {
    if (!el || !focusNext.current) return;
    focusNext.current = false;
    el.focus({ preventScroll: true });
  };

  const go = (to: number) => {
    if (to < 0 || to >= SCENES.length || to === at) return;
    setDir(to > at ? 1 : -1);
    setAt(to);
    focusNext.current = true;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest("details, button"))
      return;
    if (e.key === "ArrowRight") go(at + 1);
    if (e.key === "ArrowLeft") go(at - 1);
  };

  return (
    <section
      className="page page--wide how"
      aria-labelledby="how-title"
      data-cursor-zone
    >
      <header className="page__head">
        <h1 id="how-title" className="page__title">
          How it works
        </h1>
        <Link to="/" className="btn btn--ghost btn--small">
          Skip
        </Link>
      </header>

      <ol className="how-steps" aria-label="Walkthrough steps">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className="how-steps__btn"
              aria-current={i === at ? "step" : undefined}
              data-done={i < at}
              onClick={() => go(i)}
            >
              <span className="how-steps__num">{i + 1}</span>
              {s.step}
            </button>
          </li>
        ))}
      </ol>

      <div className="how-scene" onKeyDown={onKey}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={scene.id}
            className="how-scene__inner"
            custom={dir}
            initial={calm ? { opacity: 0 } : { opacity: 0, x: 24 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={calm ? { opacity: 0 } : { opacity: 0, x: -24 * dir }}
            transition={{
              duration: calm ? 0.12 : 0.32,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="how-scene__cast">
              <div className="how-scene__spot" aria-hidden="true" />
              <Cue pose={scene.pose} className="how-scene__cue" />
            </div>
            <div className="how-scene__copy">
              <p className="how-scene__count">
                Step {at + 1} of {SCENES.length}
              </p>
              <h2 ref={heading} tabIndex={-1} className="how-scene__title">
                {scene.title}
              </h2>
              <p className="how-scene__line">{scene.line}</p>
              <div className="how-scene__stage">
                <scene.Stage />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="how-nav" aria-label="Walkthrough">
        <button
          type="button"
          className="btn btn--ghost btn--large"
          onClick={() => go(at - 1)}
          disabled={at === 0}
        >
          <Icon name="back" size={18} />
          Back
        </button>
        {last ? (
          <Link to="/demo" className="btn btn--primary btn--large">
            Try the demo
            <Icon name="next" size={18} />
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={() => go(at + 1)}
          >
            Next
            <Icon name="next" size={18} />
          </button>
        )}
      </nav>

      <div className="how-more">
        <details className="disclosure">
          <summary>
            What Relay won't do
            <Icon name="details" size={16} />
          </summary>
          <ul className="rules">
            <li>Treat a post as proof that a trade happened.</li>
            <li>Link a wallet to a person without support for it.</li>
            <li>Fill in missing returns, entries or endorsements.</li>
            <li>Trade for you. Every trade needs your own approval.</li>
          </ul>
        </details>
        <details className="disclosure">
          <summary>
            Connected today
            <Icon name="details" size={16} />
          </summary>
          <dl className="facts">
            <div>
              <dt>Relay plans</dt>
              <dd>Connected, with full version history.</dd>
            </div>
            <div>
              <dt>Follow receipts</dt>
              <dd>Connected, verified on chain.</dd>
            </div>
            <div>
              <dt>Public posts</dt>
              <dd>
                <span className="facts__missing">Not connected yet.</span>
              </dd>
            </div>
            <div>
              <dt>Selected traders</dt>
              <dd>
                <span className="facts__missing">
                  None of the 10 traders' sources is linked yet.
                </span>
              </dd>
            </div>
            <div>
              <dt>Other activity</dt>
              <dd>
                <span className="facts__missing">
                  Wallet trades outside Relay aren't indexed yet.
                </span>
              </dd>
            </div>
          </dl>
        </details>
      </div>
    </section>
  );
}

/** A labelled stand-in: everything in the walkthrough's stages is the fictional demo trader. */
function Example({ children }: { children: ReactNode }) {
  return (
    <div className="mini" data-cursor="native">
      <span className="mini__tag">Example · fictional</span>
      {children}
    </div>
  );
}

function TraderStage() {
  return (
    <Example>
      <div className="mini-trader">
        <Avatar seed={DEMO_PLAN.seed} size={48} />
        <div className="mini-trader__who">
          <p className="mini-trader__name">{DEMO_PLAN.creator}</p>
          <p className="mini__meta">1 plan · published 12 min ago</p>
        </div>
        <KindBadge kind="fictional" />
      </div>
      <div className="mini-row">
        <PairIcon base="SOL" quote="USDC" size={28} />
        <div>
          <p className="mini-row__title">{DEMO_PLAN.pair} buy plan</p>
          <p className="mini__meta">
            Entry <span className="num">$140 – $145</span> · source: Relay demo
          </p>
        </div>
      </div>
    </Example>
  );
}

function WatchStage() {
  const [on, setOn] = useState(false);
  return (
    <Example>
      <div className="mini-plan">
        <div className="mini-plan__top">
          <PairIcon base="SOL" quote="USDC" size={32} />
          <div>
            <p className="mini-row__title">{DEMO_PLAN.pair}</p>
            <p className="mini__meta">by {DEMO_PLAN.creator}</p>
          </div>
          <span className="mini-pill">In plan range</span>
        </div>
        <dl className="trade__rows">
          <div>
            <dt>Entry</dt>
            <dd className="num">$140 – $145</dd>
          </div>
          <div>
            <dt>Window</dt>
            <dd>Closes in 33 min</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn btn--glass btn--block"
          aria-pressed={on}
          data-on={on}
          onClick={() => {
            setOn((v) => !v);
            if (!on) cueReact();
          }}
        >
          <Icon name={on ? "star-filled" : "star"} size={18} />
          {on ? "Watching (example only)" : "Try Watch"}
        </button>
      </div>
    </Example>
  );
}

const KIND_EXAMPLE: Record<RecordKind, string> = {
  public_post: `“${DEMO_PLAN.post}”`,
  onchain: "Bought 2.1 SOL for 296 USDC · signature linked to the explorer",
  relay_plan: "SOL / USDC · entry $140 – $145 · 45 min window · signed",
  fictional: "Mika is invented for the demo. Prices are simulated.",
};

const KINDS: readonly RecordKind[] = [
  "public_post",
  "onchain",
  "relay_plan",
  "fictional",
];

function EvidenceStage() {
  return (
    <ul className="mini-kinds">
      {KINDS.map((k) => (
        <li key={k}>
          <details className="mini-kind" data-cursor="native">
            <summary>
              <KindBadge kind={k} />
              <span className="mini-kind__example">{KIND_EXAMPLE[k]}</span>
              <Icon name="details" size={16} />
            </summary>
            <p className="mini-kind__meaning">{RECORD_KIND[k].meaning}</p>
            <p className="mini__meta">Example only, not a real record.</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
