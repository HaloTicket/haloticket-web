import { describe, expect, it } from "vitest";
import type { SeatMapDocument } from "../../src/types/seating";
import {
  chooseNewerDraft,
  deepEqual,
  documentTimestamp,
  draftStorageKey,
  hasLayoutContent,
  readLocalDraft,
  writeLocalDraft,
  type DraftStorage,
} from "../../src/features/organizer/event-manage/seatMapDraft";

const doc = (timestamp: string, seats = 0): SeatMapDocument => ({
  version: "2.0",
  timestamp,
  canvasSettings: { width: 1500, height: 1050, gridSize: 5, snapEnabled: true, showGrid: true },
  zones: {},
  stages: [],
  structures: [],
  seats: Array.from({ length: seats }, (_, i) => ({ id: `s${i}`, row: "A", number: i + 1, x: i, y: 0, zoneId: "z", status: "available" as const })),
  ticketTiers: [],
});

const memoryStorage = (): DraftStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe("seat map local draft", () => {
  it("keys the draft by event id only", () => {
    expect(draftStorageKey("e1")).toBe("haloticket_seatmap_draft_e1");
  });

  it("writes and reads back a draft, with its timestamp", () => {
    const storage = memoryStorage();
    expect(writeLocalDraft(storage, "e1", doc("2026-11-14T08:00:00.000Z", 2))).toEqual({ ok: true });
    const draft = readLocalDraft(storage, "e1");
    expect(draft?.doc.seats).toHaveLength(2);
    expect(draft?.savedAt).toBe(Date.parse("2026-11-14T08:00:00.000Z"));
    expect(readLocalDraft(storage, "other")).toBeNull();
  });

  it("returns the storage failure instead of swallowing it", () => {
    const full: DraftStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(writeLocalDraft(full, "e1", doc("2026-11-14T08:00:00.000Z"))).toEqual({ ok: false, message: "QuotaExceededError" });
  });

  it("treats a corrupt stored value as no draft", () => {
    const storage = memoryStorage();
    storage.setItem(draftStorageKey("e1"), "{not json");
    expect(readLocalDraft(storage, "e1")).toBeNull();
  });

  it("reads timestamps and layout content safely", () => {
    expect(documentTimestamp(doc("2026-11-14T08:00:00.000Z"))).toBe(Date.parse("2026-11-14T08:00:00.000Z"));
    expect(documentTimestamp({ timestamp: "not a date" })).toBeNull();
    expect(documentTimestamp(null)).toBeNull();
    expect(hasLayoutContent(doc("2026-11-14T08:00:00.000Z"))).toBe(false);
    expect(hasLayoutContent(doc("2026-11-14T08:00:00.000Z", 1))).toBe(true);
  });
});

describe("choosing between the local and the server draft", () => {
  const t0 = Date.parse("2026-11-14T08:00:00.000Z");

  it("offers the local draft only when it is clearly newer than the server's", () => {
    expect(chooseNewerDraft(t0 + 60_000, t0)).toBe("local");
    expect(chooseNewerDraft(t0 + 500, t0)).toBe("server"); // written together: same draft
    expect(chooseNewerDraft(t0, t0 + 60_000)).toBe("server");
  });

  it("falls back sensibly when a time is missing", () => {
    expect(chooseNewerDraft(null, t0)).toBe("server");
    expect(chooseNewerDraft(t0, null)).toBe("local");
  });
});

describe("deepEqual (history comparison without JSON.stringify)", () => {
  it("matches what JSON.stringify equality used to say", () => {
    const a = { seats: [{ id: "1", x: 1, y: 2, color: undefined }], zones: { z: { id: "z", points: [[1, 2], [3, 4]] } } };
    const same = { zones: { z: { points: [[1, 2], [3, 4]], id: "z" } }, seats: [{ id: "1", x: 1, y: 2 }] };
    expect(deepEqual(a, same)).toBe(true);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(same)); // key order differs; structurally still equal
  });

  it("finds a difference anywhere", () => {
    expect(deepEqual({ a: [1, 2, 3] }, { a: [1, 2, 4] })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual([1], { 0: 1 })).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual(1, 1)).toBe(true);
  });
});
