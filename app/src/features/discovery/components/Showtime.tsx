import { useMemo } from "react";
import { Curtain } from "../../../components/theatre/Curtain";
import { Icon } from "../../../components/ui/Icon";
import { isCaughtUp, totalNew } from "../changes";
import { useChanges } from "../queries";
import { toTargets, useDiscoveryWatch } from "../watch";
import { Avatar } from "./Avatar";

/** The four steps, each drawn as a small scene. Nothing here is data; it is the product in pictures. */
function SceneFaces() {
  return (
    <div className="art art--faces" aria-hidden="true">
      <Avatar id="arthur-hayes" name="Arthur Hayes" />
      <Avatar id="benjamin-cowen" name="Benjamin Cowen" />
      <Avatar id="peter-brandt" name="Peter Brandt" />
      <i className="art__spark" />
    </div>
  );
}

function SceneSource() {
  return (
    <svg className="art art--source" viewBox="0 0 120 120" aria-hidden="true">
      <rect x="12" y="20" width="96" height="72" rx="9" className="art__card" />
      <circle cx="22" cy="30" r="2.4" fill="#ff6b5e" />
      <circle cx="30" cy="30" r="2.4" fill="#ffd98a" />
      <circle cx="38" cy="30" r="2.4" fill="#14f195" />
      <rect
        x="20"
        y="40"
        width="64"
        height="11"
        rx="5.5"
        className="art__url"
      />
      <line
        x1="26"
        y1="45.5"
        x2="76"
        y2="45.5"
        className="art__urlline"
        pathLength={1}
      />
      <rect x="20" y="60" width="70" height="5" rx="2.5" className="art__bar" />
      <rect x="20" y="71" width="52" height="5" rx="2.5" className="art__bar" />
      <g className="art__clock">
        <circle cx="90" cy="88" r="17" />
        <path d="M90 78v10l7 4" />
      </g>
    </svg>
  );
}

function SceneWatch() {
  return (
    <svg className="art art--watch" viewBox="0 0 120 120" aria-hidden="true">
      <g className="art__bell">
        <path d="M60 52c-14 0-22 10-22 24v8h44v-8c0-14-8-24-22-24Z" />
        <path d="M54 88c1 6 11 6 12 0" />
        <line x1="60" y1="46" x2="60" y2="52" />
      </g>
      <path
        className="art__star"
        d="m60 6 5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L60 34.6 48.8 40.6l2.1-12.5-9.1-8.9 12.6-1.8Z"
      />
      <path
        className="art__wave"
        d="M30 62c-5 6-5 14 0 20M90 62c5 6 5 14 0 20"
      />
    </svg>
  );
}

function SceneUpdate() {
  return (
    <svg className="art art--update" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="24" cy="76" r="8" className="art__n1" />
      <line
        x1="32"
        y1="76"
        x2="88"
        y2="76"
        className="art__link"
        pathLength={1}
      />
      <circle cx="96" cy="76" r="8" className="art__n2" />
      <g className="art__ping">
        <circle cx="96" cy="42" r="16" />
        <path d="M96 34a6 6 0 0 0-6 6v4h12v-4a6 6 0 0 0-6-6Zm-2 14a2 2 0 0 0 4 0" />
      </g>
    </svg>
  );
}

const SCENES = [
  { label: "Pick", art: <SceneFaces /> },
  { label: "Source", art: <SceneSource /> },
  { label: "Watch", art: <SceneWatch /> },
  { label: "Update", art: <SceneUpdate /> },
] as const;

/**
 * Showtime: the curtains close over the stream, the house cheers, and the whole journey plays as
 * four small scenes. Underneath, a live strip shows what this browser is actually watching and
 * how many updates are waiting — never a game score. Opens after the third ticket, at the end of
 * the stream, or when the reader pulls the cord.
 */
export function Showtime({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const watched = useDiscoveryWatch();
  const targets = useMemo(() => toTargets(watched), [watched]);
  const changes = useChanges(targets);
  const ideas = watched.filter((w) => w.type === "idea").length;
  const profiles = watched.filter((w) => w.type === "trader").length;
  const watching = watched.length;
  const updates = changes.data !== undefined ? totalNew(changes.data) : null;
  const caughtUp =
    changes.data !== undefined ? isCaughtUp(changes.data) : false;
  const updatesPending = watching > 0 && changes.isPending && updates === null;
  const updatesUnavailable =
    watching > 0 && changes.isError && updates === null;
  const statusLabel =
    watching === 0
      ? "Nothing watched yet"
      : caughtUp
        ? "Caught up"
        : updates !== null
          ? `${updates} new update${updates === 1 ? "" : "s"}`
          : `Watching ${watching}`;

  return (
    <Curtain open={open} onClose={onClose} label="How Relay works">
      <p className="interval">
        <Icon name="star-filled" size={16} /> Interval
      </p>

      <ol className="scenes">
        {SCENES.map((s, i) => (
          <li key={s.label} className="scene">
            <span className="scene__frame">
              <span className="scene__n">{i + 1}</span>
              {s.art}
            </span>
            <span className="scene__label">{s.label}</span>
          </li>
        ))}
      </ol>

      <div
        className="book"
        aria-label={`${statusLabel}. Ideas ${ideas}, profiles ${profiles}${
          updates === null ? "" : `, updates ${updates}`
        }. Stored in this browser only.`}
      >
        <span className="book__level">
          <Icon name="star-filled" size={14} />
          {watching === 0 ? "Not watching" : "Watching"}
          <b>{watching}</b>
        </span>
        <ul className="book__counts">
          <li title="Ideas saved in this browser">
            <Icon name="post" size={16} /> {ideas}
          </li>
          <li title="Profiles saved in this browser">
            <Icon name="traders" size={16} /> {profiles}
          </li>
          <li
            title={
              watching === 0
                ? "Watch something to follow later updates"
                : updatesUnavailable
                  ? "Couldn't check for updates"
                  : updatesPending
                    ? "Checking for updates"
                    : caughtUp
                      ? "No new updates"
                      : "New timeline entries since you last looked"
            }
          >
            <Icon name="updated" size={16} />{" "}
            {watching === 0 || updatesUnavailable
              ? "—"
              : updatesPending
                ? "…"
                : caughtUp
                  ? "0"
                  : (updates ?? "—")}
          </li>
        </ul>
      </div>

      <div className="showtime__actions">
        <button
          data-curtain-exit
          type="button"
          className="btn btn--primary btn--large"
          onClick={onClose}
        >
          <Icon name="arrow-down" size={20} />
          Back to the show
        </button>
      </div>
    </Curtain>
  );
}
