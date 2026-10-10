import { Link } from "@tanstack/react-router";
import { Icon, type IconName } from "./Icon";

const TABS: { to: "/" | "/search" | "/me" | "/account"; label: string; icon: IconName }[] = [
  { to: "/", label: "Feed", icon: "feed" },
  { to: "/search", label: "Search", icon: "search" },
  { to: "/me", label: "My Plans", icon: "plans" },
  { to: "/account", label: "Account", icon: "account" },
];

/** Bottom navigation inside the safe area. Publishing is an action, not a tab. */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <ul className="tabbar__list">
        {TABS.map((t) => (
          <li key={t.to}>
            <Link
              to={t.to}
              className="tabbar__tab"
              activeOptions={{ exact: t.to === "/", includeSearch: false }}
              activeProps={{ "aria-current": "page" }}
            >
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
