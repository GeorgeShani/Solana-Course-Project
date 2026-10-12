import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useWallet } from "../../lib/wallet";
import { useGoogleAuth } from "./google-auth";

/**
 * What the reader can do, as three lit or dark orbs. Discover and Watch are always lit: they need
 * nothing. Following a plan needs a sign-in and a wallet, and lights up only when both are there.
 * When something is newly unlocked the orb opens with a short flourish and says so to screen
 * readers. It reflects the real gates in the app; it grants nothing.
 */
export function UnlockStrip() {
  const auth = useGoogleAuth();
  const { state } = useWallet();
  const signedIn = auth.status === "signed_in";
  const walletOn = state.status === "connected";
  const follow = signedIn && walletOn;

  const [announce, setAnnounce] = useState("");
  const before = useRef(follow);
  useEffect(() => {
    if (follow && !before.current) setAnnounce("Following plans is unlocked");
    if (!follow && before.current) setAnnounce("Following plans is locked");
    before.current = follow;
  }, [follow]);

  const orbs: {
    icon: IconName;
    label: string;
    on: boolean;
    needs?: { icon: IconName; ok: boolean; label: string }[];
  }[] = [
    { icon: "post", label: "Discover", on: true },
    { icon: "star", label: "Watch", on: true },
    {
      icon: "plans",
      label: "Follow a plan",
      on: follow,
      needs: [
        { icon: "account", ok: signedIn, label: "Sign in" },
        { icon: "wallet", ok: walletOn, label: "Wallet" },
      ],
    },
  ];

  return (
    <section className="unlock panel" aria-label="What you can do now">
      <ul className="unlock__row">
        {orbs.map((o) => (
          <li key={o.label} className="unlock__item" data-on={o.on}>
            <span className="unlock__orb">
              <Icon name={o.icon} size={28} />
              <span className="unlock__state" aria-hidden="true">
                <Icon name={o.on ? "shield" : "closed"} size={14} />
              </span>
            </span>
            <span className="unlock__label">{o.label}</span>
            {o.needs && (
              <span className="unlock__needs">
                {o.needs.map((n) => (
                  <span
                    key={n.label}
                    className="unlock__need"
                    data-ok={n.ok}
                    title={`${n.label}: ${n.ok ? "done" : "needed"}`}
                  >
                    <Icon name={n.icon} size={14} />
                    <span className="sr-only">
                      {n.label}: {n.ok ? "done" : "needed"}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
