import type { RiskReasonItem } from "@/types/ai";

/** The sections an admin can mark when rejecting an event; the ids are stored in the rejection notes. */
export const FLAG_FIELDS = [
  { id: "posterImage", label: "Poster & Banner" },
  { id: "title", label: "Tên & Mô tả sự kiện" },
  { id: "dates", label: "Thời gian diễn ra" },
  { id: "tickets", label: "Danh sách Hạng vé" },
  { id: "location", label: "Địa điểm sự kiện" },
  { id: "paymentInfo", label: "Thông tin thanh toán / MST" },
] as const;

export type FlagFieldId = (typeof FLAG_FIELDS)[number]["id"];

const FLAG_IDS: ReadonlySet<string> = new Set(FLAG_FIELDS.map((field) => field.id));
const MAX_QUOTES = 10;
const MAX_QUOTE_CHARS = 200;

export interface FlaggedQuote {
  field: "title" | "description";
  text: string;
}

export interface RejectionNotes {
  noteText: string;
  flaggedFields: string[];
  flaggedQuotes: FlaggedQuote[];
}

export function flagLabel(id: string): string {
  return FLAG_FIELDS.find((field) => field.id === id)?.label ?? id;
}

/** Steps of the edit wizard that hold a flagged section (the payment step is the last one: 5 with the questions step, else 4). */
export function stepsOfField(field: string, enableCustomQuestions: boolean): number[] {
  if (field === "posterImage" || field === "title" || field === "location") return [1];
  if (field === "dates" || field === "tickets") return [2];
  if (field === "paymentInfo") return [enableCustomQuestions ? 5 : 4];
  return [];
}

export function flaggedStepsFor(fields: string[], enableCustomQuestions: boolean): number[] {
  const steps = new Set<number>();
  for (const field of fields) for (const step of stepsOfField(field, enableCustomQuestions)) steps.add(step);
  return [...steps].sort((a, b) => a - b);
}

/** The flagged sections that sit on one step, in the order the admin dialog lists them. */
export function fieldsOnStep(fields: string[], step: number, enableCustomQuestions: boolean): string[] {
  return FLAG_FIELDS.filter((field) => fields.includes(field.id) && stepsOfField(field.id, enableCustomQuestions).includes(step)).map((field) => field.id);
}

function cleanQuotes(value: unknown): FlaggedQuote[] {
  if (!Array.isArray(value)) return [];
  const out: FlaggedQuote[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { field, text } = item as { field?: unknown; text?: unknown };
    if ((field !== "title" && field !== "description") || typeof text !== "string") continue;
    const clean = text.trim().slice(0, MAX_QUOTE_CHARS);
    const key = `${field}|${clean.toLowerCase()}`;
    if (clean.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push({ field, text: clean });
    if (out.length >= MAX_QUOTES) break;
  }
  return out;
}

/** `rejectionNotes` is JSON written by the admin dialog; older rejections hold plain text, which is the note itself. */
export function parseRejectionNotes(raw: string | null | undefined): RejectionNotes {
  const text = typeof raw === "string" ? raw : "";
  if (text.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as { noteText?: unknown; flaggedFields?: unknown; flaggedQuotes?: unknown };
      return {
        noteText: typeof parsed.noteText === "string" ? parsed.noteText : "",
        flaggedFields: Array.isArray(parsed.flaggedFields) ? parsed.flaggedFields.filter((id): id is string => typeof id === "string" && FLAG_IDS.has(id)) : [],
        flaggedQuotes: cleanQuotes(parsed.flaggedQuotes),
      };
    } catch {
      // not JSON after all: keep it as the note
    }
  }
  return { noteText: text, flaggedFields: [], flaggedQuotes: [] };
}

export function buildRejectionNotes(flaggedFields: string[], noteText: string, flaggedQuotes: FlaggedQuote[]): string {
  const body: { flaggedFields: string[]; noteText: string; flaggedQuotes?: FlaggedQuote[] } = { flaggedFields, noteText };
  if (flaggedQuotes.length > 0) body.flaggedQuotes = flaggedQuotes;
  return JSON.stringify(body);
}

/** Quotes the admin can send along: found something (weight above 0) by a rule or the model, inside the title or description. */
export function quotesFromRisk(items: RiskReasonItem[] | undefined): FlaggedQuote[] {
  const out: FlaggedQuote[] = [];
  const seen = new Set<string>();
  for (const item of items ?? []) {
    if (item.status === "not_assessed" || !(item.weight > 0) || (item.layer !== "RULE" && item.layer !== "AI")) continue;
    for (const piece of item.evidence ?? []) {
      if ((piece.field !== "title" && piece.field !== "description") || typeof piece.text !== "string") continue;
      const text = piece.text.trim().slice(0, MAX_QUOTE_CHARS);
      const key = `${piece.field}|${text.toLowerCase()}`;
      if (text.length < 2 || seen.has(key)) continue;
      seen.add(key);
      out.push({ field: piece.field, text });
      if (out.length >= MAX_QUOTES) return out;
    }
  }
  return out;
}

/** Sections to pre-select: the title/description one when any quote is there; null when the risk data suggests nothing. */
export function fieldsFromQuotes(quotes: FlaggedQuote[]): string[] | null {
  return quotes.length > 0 ? ["title"] : null;
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** Plain text of an editor value (HTML or text): tags dropped, a few entities decoded, whitespace collapsed. */
export function plainTextOf(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/** "still": the quoted words are still in what the organiser is editing; "fixed": they are gone. Case is ignored. */
export function quoteStatus(quote: FlaggedQuote, current: { title: string; description: string }): "still" | "fixed" {
  const haystack = plainTextOf(quote.field === "title" ? current.title : current.description).toLowerCase();
  const needle = plainTextOf(quote.text).toLowerCase();
  return needle.length > 0 && haystack.includes(needle) ? "still" : "fixed";
}
