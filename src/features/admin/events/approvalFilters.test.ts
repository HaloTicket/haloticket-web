import { describe, expect, it } from "vitest";

import { filterApprovalEvents } from "./approvalModel";

const events = [
  { id: "EV-2", title: "Jazz night", organizerName: "City Arts", categoryName: "Âm nhạc", eventApprovalStatus: "PENDING", submittedAt: "2026-09-30T23:59:59Z" },
  { id: "EV-1", title: "Art fair", organizerName: "City Arts", categoryName: "Triển lãm", eventApprovalStatus: "PENDING", createdAt: "2026-09-01T00:00:00Z" },
  { id: "EV-3", title: "Jazz festival", organizerName: "Other", categoryName: "Âm nhạc", eventApprovalStatus: "PENDING", submittedAt: "invalid", createdAt: "2026-09-15T12:00:00Z" },
  { id: "EV-4", title: "Undated", categoryName: "Âm nhạc", eventApprovalStatus: "PENDING", datesSummary: "2026-09-20" },
];

describe("approval list filters", () => {
  it("includes both date boundaries, uses createdAt fallback, and excludes missing dates", () => {
    expect(filterApprovalEvents(events, { status: "PENDING", query: "", category: "", sort: "newest", from: "2026-09-01", to: "2026-09-30" }).map((event) => event.id)).toEqual(["EV-2", "EV-3", "EV-1"]);
  });

  it("combines id search and category, then sorts by title", () => {
    expect(filterApprovalEvents(events, { status: "PENDING", query: "EV-", category: "Âm nhạc", sort: "title", from: "", to: "" }).map((event) => event.id)).toEqual(["EV-3", "EV-2", "EV-4"]);
  });

  it("sorts dated requests oldest first", () => {
    expect(filterApprovalEvents(events, { status: "PENDING", query: "City Arts", category: "", sort: "oldest", from: "", to: "" }).map((event) => event.id)).toEqual(["EV-1", "EV-2"]);
  });

  it("orders submissions within the same day by time", () => {
    const sameDay = [
      { id: "late", title: "Late", eventApprovalStatus: "PENDING", submittedAt: "2026-09-20T18:00:00Z" },
      { id: "early", title: "Early", eventApprovalStatus: "PENDING", submittedAt: "2026-09-20T09:00:00Z" },
    ];
    const filters = { status: "PENDING" as const, query: "", category: "", from: "", to: "" };
    expect(filterApprovalEvents(sameDay, { ...filters, sort: "oldest" }).map((event) => event.id)).toEqual(["early", "late"]);
    expect(filterApprovalEvents(sameDay, { ...filters, sort: "newest" }).map((event) => event.id)).toEqual(["late", "early"]);
  });
});
