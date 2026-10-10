import { RECORD_KIND, type RecordKind } from "../../lib/record-kind";
import { Icon } from "./Icon";

/** Names what kind of content a record is, in words, an icon and a border style together. */
export function KindBadge({ kind }: { kind: RecordKind }) {
  const k = RECORD_KIND[kind];
  return (
    <span className="kind" data-kind={kind}>
      <Icon name={k.icon} size={14} />
      {k.label}
    </span>
  );
}
