import { createFileRoute } from "@tanstack/react-router";
import { ChangesTab } from "../components/discovery/ChangesTab";
import { Icon } from "../components/ui/Icon";
import { useMounted } from "../lib/mounted";

/**
 * Updates: what changed in the public ideas and profiles this browser watches, since the reader
 * last looked. Nothing is marked as seen by showing this page; see ChangesTab.
 */
export const Route = createFileRoute("/updates")({
  head: () => ({ meta: [{ title: "Updates · Relay" }] }),
  component: Updates,
});

function Updates() {
  const mounted = useMounted();
  return (
    <section
      className="page page--wide"
      aria-labelledby="updates-title"
      data-cursor-zone
    >
      <header className="page__head">
        <div>
          <h1 id="updates-title" className="page__title" data-page-start>
            Updates
          </h1>
          <p className="page__lede">What changed since you last looked.</p>
        </div>
        <span className="storage-note">
          <Icon name="shield" size={13} />
          Stored in this browser only
        </span>
      </header>
      {mounted ? (
        <ChangesTab />
      ) : (
        <p className="page__text" aria-busy="true">
          Reading what you watch…
        </p>
      )}
    </section>
  );
}
