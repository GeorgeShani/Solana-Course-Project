import { Link, createFileRoute } from "@tanstack/react-router";
import { Avatar } from "../features/discovery/components/Avatar";
import { Icon, type IconName } from "../components/ui/Icon";

/**
 * Two sides of Relay, as pictures: the watcher who wants one clear timeline, and the feed member
 * whose public source becomes a profile. Nothing here is data; it explains the product with the
 * same faces, lines and badges the feed uses.
 */
export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "How Relay works" }] }),
  component: About,
});

const WATCHER_FACTS: { icon: IconName; label: string }[] = [
  { icon: "account", label: "No account" },
  { icon: "wallet", label: "No wallet" },
  { icon: "shield", label: "This browser only" },
];

function About() {
  return (
    <section
      className="page page--wide about"
      aria-labelledby="about-title"
      data-cursor-zone
    >
      <h1 id="about-title" className="sr-only" data-page-start tabIndex={-1}>
        How Relay works
      </h1>

      <div className="about__sides">
        {/* ------------------------------------------------------------ the watcher */}
        <article className="side side--watch" aria-labelledby="watcher-title">
          <h2 id="watcher-title" className="side__tag">
            <Icon name="star" size={18} /> Watcher
          </h2>

          <div
            className="mix"
            role="img"
            aria-label="Posts scattered across sites become one timeline with a bell for the next update"
          >
            <div className="mix__scatter" aria-hidden="true">
              <Avatar id="arthur-hayes" name="Arthur Hayes" />
              <Avatar id="benjamin-cowen" name="Benjamin Cowen" />
              <Avatar id="peter-brandt" name="Peter Brandt" />
              <i className="bit bit--a" />
              <i className="bit bit--b" />
              <i className="bit bit--c" />
              <i className="bit bit--d" />
              <span className="mix__tag mix__tag--bad">
                <Icon name="alert" size={14} /> Scattered
              </span>
            </div>
            <div className="mix__one" aria-hidden="true">
              <div className="tl">
                <span className="tl__dot" />
                <span className="tl__line" />
                <span className="tl__dot tl__dot--new" />
                <span className="tl__bell">
                  <Icon name="updated" size={20} />
                </span>
              </div>
              <span className="mix__tag">
                <Icon name="chain" size={14} /> One timeline
              </span>
            </div>
          </div>

          <ul className="facts-row">
            {WATCHER_FACTS.map((f) => (
              <li key={f.label} className="pill-fact">
                <Icon name={f.icon} size={16} />
                {f.label}
              </li>
            ))}
          </ul>

          <Link to="/" className="btn btn--primary side__cta">
            <Icon name="star" size={18} />
            Start watching
          </Link>
        </article>

        {/* ------------------------------------------------------------ the feed member */}
        <article className="side side--member" aria-labelledby="member-title">
          <h2 id="member-title" className="side__tag">
            <Icon name="traders" size={18} /> Feed member
          </h2>

          <ol className="steps" aria-label="Share, check, recorded">
            <li className="steps__item">
              <span className="steps__orb">
                <Icon name="external" size={26} />
              </span>
              <span className="steps__label">Share</span>
            </li>
            <li className="steps__item">
              <span className="steps__orb">
                <Icon name="shield" size={26} />
              </span>
              <span className="steps__label">Check</span>
            </li>
            <li className="steps__item">
              {/* Coverage is recorded by hand, never live: same ring as "Recorded" below. */}
              <span className="steps__orb steps__orb--recorded">
                <Avatar id="benjamin-cowen" name="Benjamin Cowen" />
              </span>
              <span className="steps__label">Recorded</span>
            </li>
          </ol>

          <ul className="legend" aria-label="What each badge means">
            <li className="legend__row">
              <span className="legend__ring legend__ring--real" />
              <span>Recorded</span>
              <small>exact link + time</small>
            </li>
            <li className="legend__row">
              <span className="legend__ring legend__ring--auto" />
              <span>Unreviewed</span>
              <small>auto-detected</small>
            </li>
            <li className="legend__row">
              <span className="legend__ring legend__ring--demo" />
              <span>Fictional</span>
              <small>never real</small>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
