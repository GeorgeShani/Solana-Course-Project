import type { IconName } from "../components/ui/Icon";

/** The app's four destinations: the phone's tab bar and the desktop header list the same ones. */
export const NAV: {
  to: "/" | "/traders" | "/watchlist" | "/account";
  label: string;
  icon: IconName;
}[] = [
  { to: "/", label: "Discover", icon: "feed" },
  { to: "/traders", label: "Traders", icon: "traders" },
  { to: "/watchlist", label: "Watchlist", icon: "star" },
  { to: "/account", label: "Account", icon: "account" },
];
