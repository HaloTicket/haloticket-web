import { describe, expect, it } from "vitest";
import { notificationTarget } from "@/utils/notificationTarget";
import { PATHS } from "@/routes/paths";

const n = (type: string, extra: { message?: string; variables?: unknown } = {}) => ({
  type,
  message: extra.message ?? "m",
  variablesJson: extra.variables === undefined ? null : typeof extra.variables === "string" ? extra.variables : JSON.stringify(extra.variables),
});

describe("notificationTarget (customer and organiser)", () => {
  it("opens the order of a TICKETS_ISSUED notification", () => {
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: { bookingCode: "HALO-1794282228280", eventId: "e1" } }), "customer"))
      .toBe(PATHS.ORDER_DETAIL("HALO-1794282228280"));
    expect(notificationTarget(n("TICKET_ISSUED", { variables: { bookingCode: "HALO-1" } }), "organizer")).toBe(PATHS.ORDER_DETAIL("HALO-1"));
  });

  it("falls back to My tickets without a usable booking code", () => {
    expect(notificationTarget(n("TICKETS_ISSUED"), "customer")).toBe(PATHS.MY_TICKETS);
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: "{not json" }), "customer")).toBe(PATHS.MY_TICKETS);
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: [1, 2] }), "customer")).toBe(PATHS.MY_TICKETS);
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: { bookingCode: 42 } }), "customer")).toBe(PATHS.MY_TICKETS);
  });

  it.each(["../admin", "javascript:alert(1)", "https://evil.example/x", "a/b", "a b", "", "x".repeat(101), "HALO-1?x=1"])(
    "never builds a path from the hostile code %j",
    (code) => {
      expect(notificationTarget(n("TICKETS_ISSUED", { variables: { bookingCode: code } }), "customer")).toBe(PATHS.MY_TICKETS);
    },
  );

  it("ignores a link in the payload", () => {
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: { bookingCode: "HALO-1", link: "https://evil.example" } }), "customer"))
      .toBe(PATHS.ORDER_DETAIL("HALO-1"));
  });

  it("opens the edit page of an approved or rejected event, My events without an id", () => {
    for (const type of ["EVENT_APPROVED", "EVENT_UPDATE_APPROVED", "EVENT_REJECTED"]) {
      expect(notificationTarget(n(type, { variables: { eventId: "ev-1" } }), "organizer")).toBe(PATHS.EVENT_MANAGE_EDIT("ev-1"));
      expect(notificationTarget(n(type), "organizer")).toBe(PATHS.MY_EVENTS);
      expect(notificationTarget(n(type, { variables: { eventId: "../x" } }), "organizer")).toBe(PATHS.MY_EVENTS);
    }
  });

  it("opens finance for payouts and the gift page for a gift invitation", () => {
    expect(notificationTarget(n("PAYOUT_APPROVED"), "organizer")).toBe(PATHS.REPORTS);
    expect(notificationTarget(n("PAYOUT_REQUESTED"), "organizer")).toBe(PATHS.REPORTS);
    const saga = "123e4567-e89b-12d3-a456-426614174000";
    expect(notificationTarget(n("GIFT_INVITATION", { message: `Bạn nhận được vé. Mã lời mời: ${saga}` }), "customer"))
      .toBe(`${PATHS.GIFT_ACCEPT}?sagaId=${saga}`);
    expect(notificationTarget(n("GIFT_INVITATION"), "customer")).toBeNull();
  });

  it("sends resale, gift and ticket notifications to My tickets", () => {
    for (const type of ["RESALE_LISTING_ACTIVATED", "RESALE_LISTING_FAILED", "GIFT_ACCEPTED", "TICKET_TRANSFERRED"]) {
      expect(notificationTarget(n(type), "customer")).toBe(PATHS.MY_TICKETS);
    }
  });

  it("does not move anyone for an unknown type (it used to open the organiser's event list)", () => {
    for (const type of ["GENERAL", "SOMETHING_NEW", "", "payment_exception", "NEW_EVENT_APPROVAL"]) {
      expect(notificationTarget(n(type), "customer")).toBeNull();
      expect(notificationTarget(n(type), "organizer")).toBeNull();
    }
  });
});

describe("notificationTarget (admin)", () => {
  it("keeps its own mapping", () => {
    expect(notificationTarget(n("PAYMENT_EXCEPTION"), "admin")).toBe(PATHS.ADMIN_RECONCILIATION);
    expect(notificationTarget(n("NEW_EVENT_APPROVAL"), "admin")).toBe(PATHS.ADMIN_EVENTS_APPROVAL);
    expect(notificationTarget(n("EVENT_UPDATED"), "admin")).toBe(PATHS.ADMIN_EVENTS_APPROVAL);
    expect(notificationTarget(n("PAYOUT_REQUESTED"), "admin")).toBe(PATHS.ADMIN_FINANCE);
  });

  it("opens the approval of an event an older message names, and stays for anything else", () => {
    expect(notificationTarget(n("OLD", { message: "Sự kiện EV_abc123 cần duyệt" }), "admin")).toBe(`${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=EV_abc123`);
    expect(notificationTarget(n("GENERAL"), "admin")).toBeNull();
    expect(notificationTarget(n("TICKETS_ISSUED", { variables: { bookingCode: "HALO-1" } }), "admin")).toBeNull();
  });
});
