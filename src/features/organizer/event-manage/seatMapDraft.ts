// Local draft of the seat map and the comparisons the studio needs. Pure apart from the storage it is given.
import type { SeatMapDocument } from '@/types/seating';

// One key per event id. A key built from the event NAME used to be written too: two events with the same name
// overwrote each other's draft, so it is gone.
export const draftStorageKey = (eventId: string): string => `haloticket_seatmap_draft_${eventId}`;

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalDraft {
  doc: SeatMapDocument;
  savedAt: number | null; // epoch ms of doc.timestamp, null when the document has none
}

export const documentTimestamp = (doc: Pick<SeatMapDocument, 'timestamp'> | null | undefined): number | null => {
  if (!doc?.timestamp) return null;
  const value = Date.parse(doc.timestamp);
  return Number.isNaN(value) ? null : value;
};

export const hasLayoutContent = (doc: Partial<SeatMapDocument> | null | undefined): boolean =>
  Boolean(
    doc &&
      ((doc.seats?.length ?? 0) > 0 ||
        (doc.stages?.length ?? 0) > 0 ||
        (doc.structures?.length ?? 0) > 0 ||
        Object.keys(doc.zones ?? {}).length > 0)
  );

export const readLocalDraft = (storage: DraftStorage, eventId: string): LocalDraft | null => {
  try {
    const raw = storage.getItem(draftStorageKey(eventId));
    if (!raw) return null;
    const doc = JSON.parse(raw) as SeatMapDocument;
    return { doc, savedAt: documentTimestamp(doc) };
  } catch {
    return null; // blocked storage or a corrupt value: behave as if there is no draft
  }
};

export type DraftWriteResult = { ok: true } | { ok: false; message: string };

// the failure is returned, not swallowed: the studio shows it (quota exceeded and blocked storage are common)
export const writeLocalDraft = (storage: DraftStorage, eventId: string, doc: SeatMapDocument): DraftWriteResult => {
  try {
    storage.setItem(draftStorageKey(eventId), JSON.stringify(doc));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
};

// which draft to offer when the browser has one and the server has one (or not). A local draft is only worth
// offering when it is clearly newer than the server's: the two are written together, so equal times mean "same".
export const chooseNewerDraft = (
  localSavedAt: number | null,
  serverSavedAt: number | null,
  graceMs = 2000
): 'local' | 'server' => {
  if (localSavedAt === null) return 'server';
  if (serverSavedAt === null) return 'local';
  return localSavedAt > serverSavedAt + graceMs ? 'local' : 'server';
};

// Structural equality with early exit. Used instead of JSON.stringify of both snapshots on every history commit:
// no string is built, and the first difference ends the walk.
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
  const rightKeys = Object.keys(right).filter((key) => right[key] !== undefined);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!(key in right) || !deepEqual(left[key], right[key])) return false;
  }
  return true;
};
