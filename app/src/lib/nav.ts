import type { IconName } from "../components/ui/Icon";

type Dest =
  "/" | "/updates" | "/watchlist" | "/plans" | "/account" | "/how-it-works";

/** The phone's bottom bar: the app's five destinations. */
export const NAV: { to: Dest; label: string; icon: IconName }[] = [
  { to: "/", label: "Discover", icon: "post" },
  { to: "/updates", label: "Updates", icon: "refresh" },
  { to: "/watchlist", label: "Watchlist", icon: "star" },
  { to: "/plans", label: "Plans", icon: "plans" },
  { to: "/account", label: "Account", icon: "account" },
];

/** The desktop header: Account lives behind the wallet control, so the guide takes its place. */
export const HEADER_NAV: { to: Dest; label: string }[] = [
  { to: "/", label: "Discover" },
  { to: "/updates", label: "Updates" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/plans", label: "Plans" },
  { to: "/how-it-works", label: "How it works" },
];
