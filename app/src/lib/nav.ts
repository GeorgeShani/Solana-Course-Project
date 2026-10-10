import type { IconName } from "../components/ui/Icon";

type Dest =
  "/" | "/ideas" | "/traders" | "/watchlist" | "/account" | "/how-it-works";

/** The phone's bottom bar: the app's five destinations. */
export const NAV: { to: Dest; label: string; icon: IconName }[] = [
  { to: "/", label: "Discover", icon: "feed" },
  { to: "/ideas", label: "Ideas", icon: "post" },
  { to: "/traders", label: "Traders", icon: "traders" },
  { to: "/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account", label: "Account", icon: "account" },
];

/** The desktop header: Account lives behind the wallet control, so the guide takes its place. */
export const HEADER_NAV: { to: Dest; label: string }[] = [
  { to: "/", label: "Discover" },
  { to: "/ideas", label: "Ideas" },
  { to: "/traders", label: "Traders" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/how-it-works", label: "How it works" },
];
