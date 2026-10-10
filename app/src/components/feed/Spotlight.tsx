import { motion, useTransform } from "motion/react";
import { useState } from "react";
import { useCalmMotion } from "../../lib/motion";
import { useStagePointer } from "../../lib/pointer";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The limelight cone from the curtain-sol stage. Each newly active act gets a fresh beam that swings
 * in from the side the reader scrolled from; between acts it holds still over the portrait.
 */
export function Spotlight({ index, lit }: { index: number; lit: boolean }) {
  const reduce = useCalmMotion();
  const pointer = useStagePointer();
  const drift = useTransform(pointer.x, (v) => v * 18);
  const [track, setTrack] = useState({ index, dir: 1 });
  if (track.index !== index)
    setTrack({ index, dir: index > track.index ? 1 : -1 });

  return (
    <motion.div
      key={index}
      className="spotlight"
      aria-hidden="true"
      style={{ transformOrigin: "50% 0%", x: drift }}
      initial={
        reduce ? false : { opacity: 0, rotate: track.dir * 14, scaleY: 0.4 }
      }
      animate={
        lit ? { opacity: 1, rotate: 0, scaleY: 1 } : { opacity: 0, scaleY: 0.4 }
      }
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.9, ease: EASE, delay: index === 0 ? 0.4 : 0 }
      }
    />
  );
}
