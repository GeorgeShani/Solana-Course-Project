import { shortHash } from "../../lib/format";
import { Icon } from "../ui/Icon";

/**
 * What the feed can prove about this plan: the onchain commitment. Follower results are not in the
 * feed API; the plan's script sheet says so instead of showing zero.
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
        <Icon name="alert" size={15} />
        Fictional preview — not onchain
      </p>
    );
  }
  return (
    <p className="evidence">
      <Icon name="chain" size={15} />
      <span>
        Committed onchain · v{version} · terms{" "}
        <span className="num">{shortHash(termsHash)}</span>
        {textVerified ? " · text matches hash" : " · text unavailable"}
      </span>
    </p>
  );
}
