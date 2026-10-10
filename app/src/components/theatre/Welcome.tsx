import { Link } from "@tanstack/react-router";
import { motion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Cue } from "../cue/Cue";
import { useCalmMotion } from "../../lib/motion";
import { useCueGaze, useStagePointer } from "../../lib/pointer";
import { ENTER_EVENT, leaveWelcome } from "../../lib/stage";
import { ENTERED_KEY, SEEN_KEY } from "./CurtainIntro";
import { MarqueeSign } from "./Marquee";

const EASE = [0.16, 1, 0.3, 1] as const;
const DRAPE_EASE = [0.33, 1, 0.68, 1] as const;
/** Cue's acknowledgement plays first; the drapes start gathering under it. */
const DRAPES_DELAY = 0.3;
const DRAPES_S = 0.9;

function remember() {
  try {
    localStorage.setItem(ENTERED_KEY, "1");
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the welcome simply shows again next time.
  }
}

/**
 * The first scene of Relay: closed curtains, the lit RELAY sign and Cue in front of the drapes
 * until the visitor chooses to enter. Then Cue turns to the plans, the drapes gather to the wings
 * where the feed's drapes rest, and the feed (already rendered underneath) takes the stage.
 *
 * Whether it shows is decided before paint by the head script (html[data-welcome]); this component
 * is always in the markup and CSS hides it otherwise, so server and client render the same tree.
 */
export function Welcome({
  forced,
  onEntered,
}: {
  /** `?welcome` asked for the scene again (Account → Meet Cue again). */
  forced: boolean;
  onEntered: () => void;
}) {
  const reduce = useCalmMotion();
  const [opening, setOpening] = useState(false);

  const pointer = useStagePointer();
  const lightX = useTransform(pointer.x, (v) => v * 64);
  const lightY = useTransform(pointer.y, (v) => v * 22);
  const leanX = useTransform(pointer.x, (v) => v * 10);
  const leanRotate = useTransform(pointer.x, (v) => v * 3);
  const drapeX = useTransform(pointer.x, (v) => v * -7);
  const cueRef = useRef<HTMLDivElement>(null);
  useCueGaze(cueRef, pointer);

  useEffect(() => {
    if (forced) document.documentElement.dataset.welcome = "on";
  }, [forced]);

  const finish = () => {
    document.documentElement.dataset.welcome = "off";
    setOpening(false);
    onEntered();
  };

  /** The drapes gather to exactly the wings the app's frame rests on, so the handover doesn't jump. */
  const [gather, setGather] = useState(0.14);

  const enter = () => {
    if (opening) return;
    remember();
    const wing = document
      .querySelector(".drapes > .drape")
      ?.getBoundingClientRect().width;
    const full = document
      .querySelector(".welcome__drape")
      ?.getBoundingClientRect().width;
    if (wing && full) setGather(Math.min(1, wing / full));
    // The feed becomes visible behind the drapes as they part.
    document.documentElement.dataset.welcome = "opening";
    setOpening(true);
  };
  const enterRef = useRef(enter);
  useEffect(() => {
    enterRef.current = enter;
  });
  useEffect(() => {
    const onEnter = () => {
      if (document.documentElement.dataset.welcome === "on") enterRef.current();
    };
    window.addEventListener(ENTER_EVENT, onEnter);
    return () => window.removeEventListener(ENTER_EVENT, onEnter);
  }, []);

  const drape = (side: 1 | -1) => (
    <motion.div
      className={`drape drape--${side === 1 ? "left" : "right"} welcome__drape`}
      aria-hidden="true"
      style={{ x: drapeX }}
      initial={false}
      animate={
        opening ? { scaleX: gather, skewY: side * 2 } : { scaleX: 1, skewY: 0 }
      }
      transition={
        reduce
          ? { duration: 0 }
          : opening
            ? { duration: DRAPES_S, ease: DRAPE_EASE, delay: DRAPES_DELAY }
            : { duration: 0 }
      }
      onAnimationComplete={() => {
        if (opening && side === 1 && !reduce) finish();
      }}
    />
  );

  return (
    <motion.section
      className="welcome"
      aria-labelledby="welcome-title"
      data-cursor-zone
      initial={false}
      animate={{ opacity: reduce && opening ? 0 : 1 }}
      transition={{ duration: reduce && opening ? 0.2 : 0 }}
      onAnimationComplete={() => {
        if (opening && reduce) finish();
      }}
    >
      {drape(1)}
      {drape(-1)}

      <motion.div
        className="welcome__scene"
        initial={false}
        animate={
          opening && !reduce ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }
        }
        transition={{
          duration: 0.35,
          ease: EASE,
          delay: opening ? DRAPES_DELAY : 0,
        }}
      >
        <div className="welcome__sign">
          <MarqueeSign heading titleId="welcome-title" />
        </div>

        <div className="welcome__stage">
          <motion.div
            className="welcome__light"
            aria-hidden="true"
            style={{ x: lightX, y: lightY }}
          />
          <motion.div
            className="welcome__lean"
            style={{ x: leanX, rotate: leanRotate }}
          >
            <motion.div
              initial={false}
              animate={
                opening && !reduce
                  ? { y: [0, -14, 0], rotate: [0, -3, 0] }
                  : { y: 0, rotate: 0 }
              }
              transition={{ duration: 0.36, ease: EASE }}
            >
              <Cue
                pose={opening ? "discover" : "welcome"}
                rootRef={cueRef}
                className="cue--lit"
                label={
                  opening
                    ? "Cue holds up a trade plan under his spotlight"
                    : "Cue, Relay's usher, waves from the curtain"
                }
              />
            </motion.div>
          </motion.div>
        </div>

        <p className="welcome__line">
          Discover Solana traders. Explore their ideas. Check the evidence.
        </p>
        <div className="welcome__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={enter}
            disabled={opening}
          >
            Explore traders
          </button>
          <Link to="/demo" className="btn btn--glass" onClick={leaveWelcome}>
            Try the demo
          </Link>
        </div>
      </motion.div>
    </motion.section>
  );
}
