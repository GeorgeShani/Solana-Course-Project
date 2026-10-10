import { useReducedMotion } from "motion/react";
import { useMounted } from "./mounted";

/**
 * Reduced-motion preference that renders identically on the server and during hydration (false),
 * then follows the device setting.
 */
export function useCalmMotion(): boolean {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  return mounted && reduce === true;
}
