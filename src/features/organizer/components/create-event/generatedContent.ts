export interface GeneratedEventContent {
  description?: unknown;
  terms_and_conditions?: unknown;
}

/**
 * Builds the text to put in the description field from an AI response.
 * Returns null when the response has no usable description: the caller must treat that
 * as an error and leave the field untouched.
 */
export function buildGeneratedDescription(res: GeneratedEventContent | null | undefined, termsLabel: string): string | null {
  if (!res || typeof res.description !== "string" || !res.description.trim()) return null;
  let full = res.description;
  if (typeof res.terms_and_conditions === "string" && res.terms_and_conditions.trim()) {
    full += "\n\n" + termsLabel + "\n" + res.terms_and_conditions;
  }
  // Strictly remove all markdown headers (#, ##, ###), bold/italic (***, **, *)
  return full
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{2,3}/g, "")
    .replace(/_{2,3}/g, "");
}
