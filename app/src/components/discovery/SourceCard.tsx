import { Icon } from "../ui/Icon";
import {
  AVAILABILITY_LABEL,
  PROVIDER_LABEL,
  formatWhen,
  safeHref,
  type SourceView,
} from "../../lib/discovery";

/**
 * One captured public source. It states what Relay knows and what it does not: the time the source
 * gives for itself (or "Unknown"), the time Relay captured it, whether it can still be opened, and
 * that a person at Relay recorded it by hand. It never calls a statement a trade.
 */
export function SourceCard({
  source,
  heading = "Original source",
}: {
  source: SourceView;
  heading?: string;
}) {
  const href = safeHref(source.url);
  const provider = PROVIDER_LABEL[source.provider] ?? source.provider;
  const gone =
    source.availability.state === "removed" ||
    source.availability.state === "unavailable";
  return (
    <figure className="source" data-availability={source.availability.state}>
      <figcaption className="source__head">
        <span className="source__heading">{heading}</span>
        <span className="source__provider">{provider}</span>
        <span className="badge badge--quiet">Manual coverage</span>
      </figcaption>

      {source.contentRemoved || source.displayedContent === null ? (
        <p className="source__gone">
          The text is no longer shown. Relay keeps a record that this source
          existed.
        </p>
      ) : (
        <blockquote className="source__quote">
          {source.displayedContent}
        </blockquote>
      )}

      <dl className="source__facts">
        <div>
          <dt>Published</dt>
          <dd>
            {formatWhen(source.publishedAt)}
            {source.publishedAt === null && (
              <span className="source__why"> (the source gives no time)</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Captured by Relay</dt>
          <dd>{formatWhen(source.retrievedAt)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-gone={gone}>
            {AVAILABILITY_LABEL[source.availability.state]}
            {source.availability.state !== "unknown" && (
              <span className="source__why">
                {" "}
                (as of {formatWhen(source.availability.observedAt)})
              </span>
            )}
          </dd>
        </div>
        {source.availability.note && (
          <div>
            <dt>Note</dt>
            <dd>{source.availability.note}</dd>
          </div>
        )}
        <div>
          <dt>Recorded by</dt>
          <dd>{source.curator}</dd>
        </div>
      </dl>

      <p className="source__links">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            Open the original
            <Icon name="external" size={14} />
          </a>
        ) : (
          <span className="source__why">No safe link to the original.</span>
        )}
      </p>
      <details className="source__more">
        <summary>How Relay recorded this</summary>
        <p>
          A person at Relay copied this source by hand. Relay does not watch the
          account live, so it may have changed since. The fingerprint below
          identifies exactly what Relay stored (link, times and text), so a
          later edit to Relay's record would show. It does not prove the source
          existed before Relay captured it.
        </p>
        <p className="source__hash num">{source.contentHash}</p>
      </details>
    </figure>
  );
}
