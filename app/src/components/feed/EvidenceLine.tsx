import { shortHash } from "../../lib/format";
import { Icon } from "../ui/Icon";

/**
 * What the feed can prove about this plan. The feed API carries the onchain commitment, not
 * follower receipts, so follower results are explicitly absent here rather than shown as zero.
 */
export function EvidenceLine({
  version,
  termsHash,
  textVerified,
  fictionalPreview,
}: {
  version: number;
  termsHash: string;
  textVerified: boolean;
  fictionalPreview: boolean;
}) {
  if (fictionalPreview) {
    return (
      <p className="evidence" data-kind="fictional">
        <Icon name="alert" size={16} />
        Fictional preview — not onchain, no follower data
      </p>
    );
  }
  return (
    <div className="evidence">
      <p>
        <Icon name="chain" size={16} />
        Committed onchain · v{version} · terms{" "}
        <span className="num">{shortHash(termsHash)}</span>
        {textVerified ? " · text matches hash" : " · text unavailable"}
      </p>
      <p className="evidence__absent">
        Follower results aren't shown in the feed yet.
      </p>
    </div>
  );
}
