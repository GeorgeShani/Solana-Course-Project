import type { ReactNode } from "react";
import { Sigil } from "./Sigil";

/**
 * Arched stage portrait in a brass frame. Every creator is shown by their sigil: Relay has no
 * uploaded photos, and it never invents a face for a wallet.
 */
export function Portrait({
  seed,
  dim = false,
  children,
}: {
  seed: string;
  dim?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="portrait" data-dim={dim}>
      <div className="portrait__sigil">
        <Sigil seed={seed} size="72%" />
      </div>
      {children && <div className="portrait__plate">{children}</div>}
    </div>
  );
}

export function Avatar({ seed, size = 40 }: { seed: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      <Sigil seed={seed} size="100%" />
    </span>
  );
}
