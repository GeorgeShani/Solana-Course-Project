import { Icon } from "../../../components/ui/Icon";
import {
  AVAILABILITY_LABEL,
  PROVIDER_LABEL,
  RECORD_TYPE_LABEL,
  sourceHost,
  formatWhen,
  safeHref,
  shortDate,
  type SourceView,
} from "../model";

/**
 * One captured public source. It states what Relay knows and what it does not: the time the source
 * gives for itself (or "Unknown"), whether it could be opened when Relay looked, and a link to the
 * original. How it was captured, by whom, and the fingerprint of the stored record are one tap away.
 * It never calls a statement a trade.
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
        <span className="source__provider">
          {RECORD_TYPE_LABEL[source.recordType] ?? source.recordType} ·{" "}
          {sourceHost(source.url) ?? provider}
        </span>
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
          <dd title={formatWhen(source.publishedAt)}>
            {shortDate(source.publishedAt) ?? "Date unknown"}
            {source.publishedAt === null && (
              <span className="source__why"> (the source gives no time)</span>
            )}
          </dd>
        </div>
        <div>
          <dt>When Relay looked</dt>
          <dd data-gone={gone}>
            {AVAILABILITY_LABEL[source.availability.state]}
          </dd>
        </div>
        {source.availability.note && (
          <div>
            <dt>Note</dt>
            <dd>{source.availability.note}</dd>
          </div>
        )}
      </dl>

      <p className="source__links">
        {href ? (
          <a
            className="btn btn--glass btn--small"
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Open the original
            <Icon name="external" size={16} />
          </a>
        ) : (
          <span className="source__why">No safe link to the original.</span>
        )}
      </p>
      <details className="source__more">
        <summary>How Relay recorded this</summary>
        <p>
          {source.curator} copied this source by hand on{" "}
          {formatWhen(source.retrievedAt)}
          {source.availability.state !== "unknown" &&
            ` and checked it then (${AVAILABILITY_LABEL[source.availability.state].toLowerCase()})`}
          . Relay does not watch the account live, so it may have changed since.
        </p>
        <p>
          The fingerprint below identifies exactly what Relay stored (link,
          times and text), so a later edit to Relay's record would show. It does
          not prove the source existed before Relay captured it.
        </p>
        <p className="source__hash num">{source.contentHash}</p>
      </details>
    </figure>
  );
}
