import { describe, expect, it } from "vitest";
import type { Seat, SeatTier, ZoneBlock } from "../../src/types/seating";
import { countIssues, validateSeatMap } from "../../src/features/organizer/event-manage/seatMapValidation";
import type { SeatMapLayout } from "../../src/features/organizer/event-manage/seatMapEditing";

const tiers: SeatTier[] = [{ id: "t1", name: "VIP", price: 1000, color: "#f59e0b" }];

const zone = (id: string, extra: Partial<ZoneBlock> = {}): ZoneBlock => ({
  id,
  name: id.toUpperCase(),
  color: "#111",
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  tierId: "t1",
  ...extra,
});

const seat = (id: string, row: string, number: number, extra: Partial<Seat> = {}): Seat => ({
  id,
  row,
  number,
  x: 120 + number * 20,
  y: 120,
  zoneId: "z1",
  status: "available",
  ...extra,
});

const clean = (): SeatMapLayout => ({
  seats: [seat("s1", "A", 1), seat("s2", "A", 2)],
  stages: [],
  structures: [],
  zones: { z1: zone("z1") },
});

const codes = (layout: SeatMapLayout, t: SeatTier[] = tiers) => validateSeatMap(layout, t).map((i) => i.code);

describe("validateSeatMap", () => {
  it("finds nothing wrong with a clean map", () => {
    expect(validateSeatMap(clean(), tiers)).toEqual([]);
  });

  it("reports a map with no seats and no standing zone as an error", () => {
    const layout: SeatMapLayout = { seats: [], stages: [], structures: [], zones: {} };
    const issues = validateSeatMap(layout, tiers);
    expect(issues.map((i) => i.code)).toEqual(["NO_SEATS"]);
    expect(issues[0].severity).toBe("error");
  });

  it("accepts a map made only of standing zones that have a capacity", () => {
    const layout: SeatMapLayout = { seats: [], stages: [], structures: [], zones: { z1: zone("z1", { capacity: 500 }) } };
    expect(codes(layout)).toEqual([]);
  });

  it("reports duplicate labels in one zone, but not the same label in two zones", () => {
    const layout = clean();
    layout.seats.push(seat("s3", "a", 1)); // same row (case-insensitive) and number as s1
    const issues = validateSeatMap(layout, tiers).filter((i) => i.code === "DUPLICATE_SEAT_LABEL");
    expect(issues).toHaveLength(1);
    expect(issues[0].target?.ids).toEqual(["s1", "s3"]);
    expect(issues[0].params).toMatchObject({ label: "A1", count: 2 });

    const twoZones = clean();
    twoZones.zones.z2 = zone("z2", { x: 500 });
    twoZones.seats.push(seat("s3", "A", 1, { zoneId: "z2", x: 520, y: 120 }));
    expect(codes(twoZones)).not.toContain("DUPLICATE_SEAT_LABEL");
  });

  it("reports seats outside their zone as a warning and seats of a missing zone as an error", () => {
    const outside = clean();
    outside.seats.push(seat("s3", "A", 3, { x: 2000, y: 2000 }));
    const found = validateSeatMap(outside, tiers).find((i) => i.code === "SEAT_OUTSIDE_ZONE");
    expect(found).toMatchObject({ severity: "warning", target: { kind: "seat", id: "s3" } });

    const orphan = clean();
    orphan.seats.push(seat("s9", "B", 1, { zoneId: "gone" }));
    expect(validateSeatMap(orphan, tiers).find((i) => i.code === "SEAT_ZONE_MISSING")?.severity).toBe("error");
  });

  it("reports a zone without a ticket tier, and one pointing at a tier that no longer exists", () => {
    const noTier = clean();
    noTier.zones.z1 = zone("z1", { tierId: undefined });
    const issues = validateSeatMap(noTier, tiers);
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["ZONE_WITHOUT_TIER", "SEATS_WITHOUT_TIER"]));
    expect(issues.find((i) => i.code === "ZONE_WITHOUT_TIER")?.target).toEqual({ kind: "zone", id: "z1" });

    const unknown = clean();
    unknown.zones.z1 = zone("z1", { tierId: "deleted" });
    expect(codes(unknown)).toContain("ZONE_TIER_UNKNOWN");
    expect(codes(unknown, [])).not.toContain("ZONE_TIER_UNKNOWN"); // tiers not loaded yet: no verdict
  });

  it("does not flag a seat that takes its tier from the zone", () => {
    expect(codes(clean())).not.toContain("SEATS_WITHOUT_TIER");
  });

  it("reports a zone with neither seats nor capacity", () => {
    const layout = clean();
    layout.zones.z2 = zone("z2", { x: 600 });
    expect(codes(layout)).toContain("ZONE_EMPTY");
  });

  it("counts errors and warnings", () => {
    const layout = clean();
    layout.zones.z1 = zone("z1", { tierId: undefined });
    layout.zones.z2 = zone("z2", { x: 600, tierId: "t1" });
    const counts = countIssues(validateSeatMap(layout, tiers));
    expect(counts.errors).toBe(1); // z1 has no tier
    expect(counts.warnings).toBe(2); // its seats have none either, and z2 is empty
  });
});
