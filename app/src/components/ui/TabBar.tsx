import { Link } from "@tanstack/react-router";
import { NAV } from "../../lib/nav";
import { Icon } from "./Icon";

/**
 * Bottom navigation on phones, inside the safe area. Hidden during the welcome and on desktop,
 * where the header carries the same links.
 */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <ul className="tabbar__list">
        {NAV.map((t) => (
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
