import type { Curation } from "./curation";

/** A source captured longer ago than this is flagged as stale: it should be re-opened and re-checked. */
export const STALE_AFTER_DAYS = 30;

export interface TraderReport {
  id: string;
  displayName: string;
  participation: string;
  sources: number;
  ideas: number;
  wallets: number;
  /** Counts of the relationship basis of every later item. */
  laterItems: Record<string, number>;
  newestCapture: string | null;
  oldestCapture: string | null;
  warnings: string[];
}

export interface CurationReport {
  demo: boolean;
  asOf: string;
  traders: TraderReport[];
  warnings: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A reading of the curated file for a human, produced before anything is loaded: how much is
 * covered, how fresh it is, and what a reviewer should look at again. It changes nothing and
 * visits no link.
 */
export function curationReport(c: Curation, now: Date): CurationReport {
  const traders = c.traders.map((t): TraderReport => {
    const warnings: string[] = [];
    const captures = t.sources.map((s) => s.retrievedAt.getTime());
    const laterItems: Record<string, number> = {};
    for (const idea of t.ideas)
      for (const e of idea.events)
        if (e.type === "update_published")
          laterItems[e.relationshipBasis] =
            (laterItems[e.relationshipBasis] ?? 0) + 1;
    for (const s of t.sources) {
      const age = Math.floor(
        (now.getTime() - s.retrievedAt.getTime()) / DAY_MS,
      );
      if (age > STALE_AFTER_DAYS)
        warnings.push(
          `source ${s.id} was captured ${age} days ago: open it again and add an availability entry`,
        );
      if (s.publishedAt === null)
        warnings.push(`source ${s.id} gives no publication time`);
    }
    if ((laterItems.uncertain ?? 0) > 0)
      warnings.push(
        `${laterItems.uncertain} later item(s) have an uncertain link: shown as "link not established"`,
      );
    if (
      t.participation === "public_source_only" &&
      t.links.some((l) => l.kind === "wallet")
    )
      warnings.push(
        "a wallet is linked to a public-source-only profile: check its identity basis",
      );
    return {
      id: t.id,
      displayName: t.displayName,
      participation: t.participation,
      sources: t.sources.length,
      ideas: t.ideas.length,
      wallets: t.links.filter((l) => l.kind === "wallet").length,
      laterItems,
      newestCapture: captures.length
        ? new Date(Math.max(...captures)).toISOString()
        : null,
      oldestCapture: captures.length
        ? new Date(Math.min(...captures)).toISOString()
        : null,
      warnings,
    };
  });
  return {
    demo: c.demo,
    asOf: now.toISOString(),
    traders,
    warnings: traders.reduce((n, t) => n + t.warnings.length, 0),
  };
}

export function formatReport(r: CurationReport): string {
  const lines = [
    `${r.demo ? "FICTIONAL DEMO file" : "Live curation file"} as of ${r.asOf}`,
  ];
  for (const t of r.traders) {
    const later = Object.entries(t.laterItems)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ");
    lines.push(
      "",
      `${t.displayName} (${t.id}) · ${t.participation}`,
      `  ${t.sources} source(s), ${t.ideas} idea(s), ${t.wallets} wallet link(s)`,
      `  later items: ${later || "none"}`,
      `  captured: ${t.oldestCapture ?? "n/a"} to ${t.newestCapture ?? "n/a"}`,
      ...t.warnings.map((w) => `  ! ${w}`),
    );
  }
  lines.push("", `${r.warnings} warning(s)`);
  return lines.join("\n");
}
