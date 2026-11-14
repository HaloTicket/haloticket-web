// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Seat, ZoneBlock } from "../../src/types/seating";
import {
  buildClipboard,
  clampZoom,
  fitZoom,
  isTypingTarget,
  neighborSeatId,
  nudgeSelection,
  pasteClipboard,
  pinchZoom,
  zoomAtPoint,
  type SeatMapLayout,
  type SeatMapSelection,
} from "../../src/features/organizer/event-manage/seatMapEditing";

const seat = (id: string, x: number, y: number, zoneId = "z1", extra: Partial<Seat> = {}): Seat => ({
  id,
  row: "A",
  number: Number(id.replace(/\D/g, "")) || 1,
  x,
  y,
  zoneId,
  status: "available",
  ...extra,
});

const zone = (id: string, extra: Partial<ZoneBlock> = {}): ZoneBlock => ({ id, name: id, color: "#111", x: 100, y: 100, width: 300, height: 200, ...extra });

const layout = (): SeatMapLayout => ({
  seats: [seat("s1", 110, 110), seat("s2", 150, 110), seat("s3", 190, 110, "z2")],
  stages: [{ id: "st1", type: "stage", label: "Sân khấu", x: 0, y: 0, width: 200, height: 80, color: "#6366f1" }],
  structures: [{ id: "x1", type: "exit", label: "Lối ra", x: 500, y: 0, width: 60, height: 40, color: "#ef4444" }],
  zones: { z1: zone("z1"), z2: zone("z2", { x: 600 }) },
});

const none: SeatMapSelection = { seatIds: [], stageId: null, structureId: null, zoneId: null };

let counter = 0;
const makeId = (kind: string) => `${kind}_new_${(counter += 1)}`;

describe("seat map clipboard", () => {
  it("copies nothing when nothing is selected", () => {
    expect(buildClipboard(layout(), none)).toBeNull();
  });

  it("copies selected seats and pastes them offset, with new ids, in the same zone", () => {
    const clip = buildClipboard(layout(), { ...none, seatIds: ["s1", "s2"] });
    const { layout: next, selection } = pasteClipboard(layout(), clip!, 32, makeId);
    expect(next.seats).toHaveLength(5);
    const pasted = next.seats.slice(3);
    expect(pasted.map((s) => [s.x, s.y, s.zoneId])).toEqual([[142, 142, "z1"], [182, 142, "z1"]]);
    expect(new Set(next.seats.map((s) => s.id)).size).toBe(5);
    expect(selection.seatIds).toEqual(pasted.map((s) => s.id));
  });

  it("duplicates a whole zone with its seats: new zone id, seats follow it, zone is selected", () => {
    const clip = buildClipboard(layout(), { ...none, zoneId: "z1" });
    expect(clip?.seats.map((s) => s.id)).toEqual(["s1", "s2"]);
    const { layout: next, selection } = pasteClipboard(layout(), clip!, 40, makeId, " (copy)");
    const newZoneId = selection.zoneId!;
    expect(newZoneId).not.toBe("z1");
    expect(next.zones[newZoneId]).toMatchObject({ name: "z1 (copy)", x: 140, y: 140, width: 300 });
    expect(next.seats.filter((s) => s.zoneId === newZoneId)).toHaveLength(2);
    expect(next.seats.filter((s) => s.zoneId === "z1")).toHaveLength(2); // the original keeps its seats
    expect(selection.seatIds).toEqual([]);
  });

  it("duplicates stages and structures too", () => {
    const stageClip = buildClipboard(layout(), { ...none, stageId: "st1" });
    const stagePaste = pasteClipboard(layout(), stageClip!, 20, makeId);
    expect(stagePaste.layout.stages).toHaveLength(2);
    expect(stagePaste.layout.stages[1]).toMatchObject({ x: 20, y: 20, label: "Sân khấu" });
    expect(stagePaste.selection.stageId).toBe(stagePaste.layout.stages[1].id);

    const structClip = buildClipboard(layout(), { ...none, structureId: "x1" });
    const structPaste = pasteClipboard(layout(), structClip!, 20, makeId);
    expect(structPaste.layout.structures).toHaveLength(2);
    expect(structPaste.layout.structures[1].id).not.toBe("x1");
  });

  it("does not touch the original layout", () => {
    const original = layout();
    const clip = buildClipboard(original, { ...none, seatIds: ["s1"] });
    pasteClipboard(original, clip!, 10, makeId);
    expect(original.seats).toHaveLength(3);
  });
});

describe("nudging the selection", () => {
  it("moves selected seats only, keeping other lists by reference", () => {
    const base = layout();
    const next = nudgeSelection(base, { ...none, seatIds: ["s1"] }, 5, -5);
    expect(next.seats[0]).toMatchObject({ x: 115, y: 105 });
    expect(next.seats[1]).toBe(base.seats[1]);
    expect(next.stages).toBe(base.stages);
    expect(next.zones).toBe(base.zones);
  });

  it("moves a zone together with its seats, once", () => {
    const next = nudgeSelection(layout(), { ...none, zoneId: "z1", seatIds: ["s1"] }, 10, 0);
    expect(next.zones.z1).toMatchObject({ x: 110, y: 100 });
    expect(next.seats.map((s) => s.x)).toEqual([120, 160, 190]); // s1 counted once, z2's seat untouched
  });

  it("leaves locked elements where they are", () => {
    const base = layout();
    base.seats[0] = { ...base.seats[0], locked: true };
    base.stages[0] = { ...base.stages[0], locked: true };
    const next = nudgeSelection(base, { ...none, seatIds: ["s1"], stageId: "st1" }, 5, 5);
    expect(next.seats[0].x).toBe(110);
    expect(next.stages[0].x).toBe(0);
  });

  it("returns the same layout for a zero move", () => {
    const base = layout();
    expect(nudgeSelection(base, { ...none, seatIds: ["s1"] }, 0, 0)).toBe(base);
  });
});

describe("zoom helpers", () => {
  it("clamps the zoom", () => {
    expect(clampZoom(5)).toBe(20);
    expect(clampZoom(500)).toBe(200);
    expect(clampZoom(87.4)).toBe(87);
  });

  it("keeps the content point under the pointer while zooming", () => {
    const before = { zoom: 100, pointer: { x: 300, y: 200 }, scroll: { left: 400, top: 100 } };
    const contentX = (before.scroll.left + before.pointer.x) / 1;
    const contentY = (before.scroll.top + before.pointer.y) / 1;
    const after = zoomAtPoint({ ...before, nextZoom: 150 });
    expect((after.left + before.pointer.x) / 1.5).toBeCloseTo(contentX);
    expect((after.top + before.pointer.y) / 1.5).toBeCloseTo(contentY);
  });

  it("never scrolls to a negative position when zooming out", () => {
    const after = zoomAtPoint({ zoom: 200, nextZoom: 50, pointer: { x: 10, y: 10 }, scroll: { left: 0, top: 0 } });
    expect(after.left).toBeGreaterThanOrEqual(0);
    expect(after.top).toBeGreaterThanOrEqual(0);
  });

  it("fits big content into the viewport, and never below the minimum zoom", () => {
    expect(fitZoom({ viewport: { width: 1000, height: 600 }, content: { width: 880, height: 480 } })).toBe(100);
    expect(fitZoom({ viewport: { width: 1000, height: 600 }, content: { width: 4880, height: 480 } })).toBe(20);
    expect(fitZoom({ viewport: { width: 1000, height: 600 }, content: { width: 10, height: 10 } })).toBe(200);
  });

  it("computes the pinch zoom from the change of distance between two fingers", () => {
    expect(pinchZoom(100, 100, 150)).toBe(150);
    expect(pinchZoom(100, 100, 50)).toBe(50);
    expect(pinchZoom(100, 0, 50)).toBe(100);
    expect(pinchZoom(150, 100, 400)).toBe(200);
  });
});

describe("keyboard helpers", () => {
  it("does not capture keys while the user types", () => {
    document.body.innerHTML = '<input id="i"/><textarea id="t"></textarea><select id="s"></select><div id="d"></div><div id="r" role="textbox"></div>';
    expect(isTypingTarget(document.getElementById("i"))).toBe(true);
    expect(isTypingTarget(document.getElementById("t"))).toBe(true);
    expect(isTypingTarget(document.getElementById("s"))).toBe(true);
    expect(isTypingTarget(document.getElementById("r"))).toBe(true);
    expect(isTypingTarget(document.getElementById("d"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("moves between seats with the arrow keys, preferring the seat in line", () => {
    const seats = [seat("s1", 0, 0), seat("s2", 40, 0), seat("s3", 30, 60), seat("s4", 0, 40)];
    expect(neighborSeatId(seats, "s1", "right")).toBe("s2");
    expect(neighborSeatId(seats, "s1", "down")).toBe("s4");
    expect(neighborSeatId(seats, "s2", "left")).toBe("s1");
    expect(neighborSeatId(seats, "s1", "left")).toBeNull();
    expect(neighborSeatId(seats, "missing", "right")).toBeNull();
  });
});
