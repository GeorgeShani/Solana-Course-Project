import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { levelOf, totalStamps, useStamps } from "../stamps";
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
 * four small scenes with the reader's stamp book underneath. Opens by itself once after the third
 * ticket, or when the reader pulls the cord. The reader's title and stamps are their own actions,
 * kept in this browser; they say nothing about any idea, trade or result.
 */
export function Showtime({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const go = useRef<HTMLButtonElement>(null);
  const [round, setRound] = useState(0);
  const book = useStamps();
  const total = totalStamps(book);
  const level = levelOf(total);
  const has = (k: "seen" | "sourced" | "watched") =>
    Object.values(book).filter((s) => s.includes(k)).length;
  const pct =
    level.toNext === null
      ? 100
      : Math.min(100, (total / (total + level.toNext)) * 100);

  useEffect(() => {
    if (!open) return;
    setRound(0);
    // The curtains take a moment to close; focus the way out once they have.
    const t = window.setTimeout(() => go.current?.focus(), 1100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className="showtime"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label="How Relay works"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="showtime__drape showtime__drape--l" />
      <div className="showtime__drape showtime__drape--r" />
      <div className="showtime__valance" />

      <div className="showtime__stage" key={round}>
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
          aria-label={`Your stamps: ${total}, ${level.name}`}
        >
          <span className="book__level">
            <Icon name="star-filled" size={14} /> {level.name}
            <b>{total}</b>
          </span>
          <span className="book__bar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
          <ul className="book__counts">
            <li title="Looked at">
              <Icon name="post" size={16} /> {has("seen")}
            </li>
            <li title="Opened the source">
              <Icon name="external" size={16} /> {has("sourced")}
            </li>
            <li title="Watched">
              <Icon name="star" size={16} /> {has("watched")}
            </li>
          </ul>
        </div>

        <div className="showtime__actions">
          <button
            type="button"
            className="orb"
            onClick={() => setRound((r) => r + 1)}
            aria-label="Play the scenes again"
          >
            <Icon name="replay" size={24} />
          </button>
          <button
            ref={go}
            type="button"
            className="btn btn--primary btn--large"
            onClick={onClose}
          >
            <Icon name="arrow-down" size={20} />
            Back to the show
          </button>
        </div>
      </div>
    </div>
  );
}
