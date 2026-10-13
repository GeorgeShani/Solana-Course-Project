import { Link, useRouter } from "@tanstack/react-router";
import { motion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Cue } from "../../components/cue/Cue";
import { useCalmMotion } from "../../lib/motion";
import { useCueGaze, useStagePointer } from "../../lib/pointer";
import { ENTER_EVENT } from "./stage";
import { WELCOME_EVENT, leaveWelcome, markWelcomeSeen } from "./welcome-state";
import { MarqueeSign } from "../../components/theatre/Marquee";
import { useMounted } from "../../lib/mounted";

const EASE = [0.16, 1, 0.3, 1] as const;
const DRAPE_EASE = [0.33, 1, 0.68, 1] as const;
/** Cue's acknowledgement plays first; the drapes start gathering under it. */
const DRAPES_DELAY = 0.1;
const DRAPES_S = 0.6;

/**
 * The first scene of Relay: closed curtains, the lit RELAY sign and Cue in front of the drapes
 * until the visitor chooses to enter. Then Cue turns to the plans, the drapes gather to the wings
 * where the feed's drapes rest, and the feed (already rendered underneath) takes the stage.
 *
 * Whether it shows is decided before paint by the head script (html[data-welcome]); this component
 * is always in the root markup and CSS hides it otherwise, so server and client render the same
 * tree. "Meet Cue" (header, Account) reopens it from any page through `requestWelcome`; the URL
 * never changes, and entering from another page takes the visitor to Discover.
 */
export function Welcome() {
  const reduce = useCalmMotion();
  const mounted = useMounted();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);

  const pointer = useStagePointer();
  const lightX = useTransform(pointer.x, (v) => v * 64);
  const lightY = useTransform(pointer.y, (v) => v * 22);
  const leanX = useTransform(pointer.x, (v) => v * 10);
  const leanRotate = useTransform(pointer.x, (v) => v * 3);
  const drapeX = useTransform(pointer.x, (v) => v * -7);
  const cueRef = useRef<HTMLDivElement>(null);
  useCueGaze(cueRef, pointer);

  const finish = () => {
    document.documentElement.dataset.welcome = "off";
    setOpening(false);
    if (window.location.pathname !== "/") void router.navigate({ to: "/" });
    requestAnimationFrame(focusPageStart);
  };

  // Compatibility: an old `?welcome` link opens this scene (the boot script did) and is then
  // replaced by the clean path, so no product link or reload depends on the parameter.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    router.history.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [router]);

  // Reopened from the header or Account: start from closed curtains and put focus on the action.
  useEffect(() => {
    const onReopen = () => {
      setOpening(false);
      setGather(0.14);
      requestAnimationFrame(() => primary.current?.focus());
    };
    window.addEventListener(WELCOME_EVENT, onReopen);
    return () => window.removeEventListener(WELCOME_EVENT, onReopen);
  }, []);

  /** The drapes gather to exactly the wings the app's frame rests on, so the handover doesn't jump. */
  const [gather, setGather] = useState(0.14);

  const enter = () => {
    if (opening) return;
    markWelcomeSeen();
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

  // Safety net: if the browser throttles animation (a background tab), the scene still hands over.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!opening) return;
    const t = window.setTimeout(
      () => {
        if (document.documentElement.dataset.welcome === "opening")
          finishRef.current();
      },
      (DRAPES_DELAY + DRAPES_S) * 1000 + 1500,
    );
    return () => window.clearTimeout(t);
  }, [opening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        document.documentElement.dataset.welcome === "on"
      )
        enterRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
                    ? "Cue holds up an idea under his spotlight"
                    : "Cue, Relay's usher, waves from the curtain"
                }
              />
            </motion.div>
          </motion.div>
        </div>

        <p className="welcome__headline">
          See the original idea. Follow what changed.
        </p>
        <p className="welcome__line">
          Traders&rsquo; public ideas, with their sources and every update in
          one timeline.
        </p>
        <div className="welcome__actions">
          <button
            ref={primary}
            type="button"
            className="btn btn--primary"
            onClick={enter}
            // Until the page has hydrated the button cannot work; saying so beats a dead click.
            disabled={opening || !mounted}
          >
            Explore ideas
          </button>
          <Link
            to="/about"
            className="btn btn--ghost"
            onClick={() => {
              markWelcomeSeen();
              leaveWelcome();
            }}
          >
            How it works
          </Link>
        </div>
      </motion.div>
    </motion.section>
  );
}

/** After the curtains open the reader lands on the page's own title, not on a hidden control. */
function focusPageStart() {
  const target =
    document.querySelector<HTMLElement>("#main [data-page-start]") ??
    document.querySelector<HTMLElement>("#main h1");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
