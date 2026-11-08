import type { ReactNode } from "react";
import type { RiskReasonItem } from "@/types/ai";

/** Quoted evidence of the given field (default: the description), longest first, without duplicates. */
export function evidenceQuotes(items: RiskReasonItem[] | undefined, field = "description"): string[] {
  const seen = new Set<string>();
  for (const item of items ?? []) {
    for (const piece of item.evidence ?? []) {
      const text = typeof piece.text === "string" ? piece.text.trim() : "";
      if (piece.field === field && text.length >= 2) seen.add(text);
    }
  }
  return [...seen].sort((a, b) => b.length - a.length);
}

/**
 * Splits `text` into plain strings and <mark> nodes for every quote found in it (first occurrence of each quote).
 * Built as React nodes, so the text is always escaped; a quote that is not in the text is skipped.
 */
export function highlightEvidence(text: string, quotes: string[]): ReactNode[] {
  const ranges: Array<[number, number]> = [];
  for (const quote of quotes) {
    const needle = quote.trim();
    if (needle.length < 2) continue;
    const start = text.indexOf(needle);
    if (start >= 0) ranges.push([start, start + needle.length]);
  }
  if (ranges.length === 0) return [text];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], index) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <mark key={`${start}-${index}`} className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/40 dark:text-amber-50">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
