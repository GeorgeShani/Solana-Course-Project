import { createElement, memo, useId, type ReactNode, type Ref } from "react";
import type { CueArtNode } from "./art-node";
import { CUE_ART, type CuePose } from "./cue-art";

export type { CuePose };

/**
 * Cue, Relay's usher: the purple gecko from the Figma character study, drawn from the exported
 * vector poses. Pupils and eye glints carry classes so a parent can move them inside the eye with
 * the --cue-look-x / --cue-look-y custom properties (theatre.css); nothing else is animated here.
 */
export const Cue = memo(function Cue({
  pose,
  label,
  className,
  rootRef,
}: {
  pose: CuePose;
  /** Spoken description. Without one Cue is decorative and hidden from assistive tech. */
  label?: string;
  className?: string;
  rootRef?: Ref<HTMLDivElement>;
}) {
  // Clip-path ids must be unique per instance: two Cues on one page would otherwise share them.
  const uid = `cue${useId().replace(/[^a-zA-Z0-9]/g, "")}-`;
  return (
    <div
      ref={rootRef}
      className={className ? `cue ${className}` : "cue"}
      data-pose={pose}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 400 400" className="cue__art" focusable="false">
        {render(CUE_ART[pose], uid, "0")}
      </svg>
    </div>
  );
});

function render(node: CueArtNode, uid: string, key: string): ReactNode {
  const props: Record<string, string> = { key };
  for (const [k, v] of Object.entries(node.a)) {
    if (k === "id") props.id = uid + v;
    else if (k === "clipPath")
      props.clipPath = v.replace("url(#", `url(#${uid}`);
    else props[k] = v;
  }
  return createElement(
    node.t,
    props,
    node.c?.map((child, i) => render(child, uid, `${key}.${i}`)),
  );
}
