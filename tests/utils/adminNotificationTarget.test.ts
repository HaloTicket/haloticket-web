import { describe, expect, it } from "vitest";
import { adminNotificationTarget } from "@/utils/adminNotificationTarget";
import { PATHS } from "@/routes/paths";
import type { NotificationItem } from "@/types";

const item = (type: string): NotificationItem => ({ id: "n1", userId: "ADMIN", type, title: "t", message: "m" });

describe("adminNotificationTarget", () => {
  it("opens the reconciliation page for a payment that needs a person", () => {
    expect(adminNotificationTarget(item("PAYMENT_EXCEPTION"))).toBe(PATHS.ADMIN_RECONCILIATION);
  });
  it("keeps the event approval target for event notifications", () => {
    expect(adminNotificationTarget(item("NEW_EVENT_APPROVAL"))).toBe(PATHS.ADMIN_EVENTS_APPROVAL);
    expect(adminNotificationTarget(item("EVENT_UPDATED"))).toBe(PATHS.ADMIN_EVENTS_APPROVAL);
  });
  it("has no target for other types (they stay in the inbox)", () => {
    expect(adminNotificationTarget(item("GENERAL"))).toBeNull();
    expect(adminNotificationTarget(item("payment_exception"))).toBeNull();
  });
});
