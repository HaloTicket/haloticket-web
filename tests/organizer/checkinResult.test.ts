import { describe, expect, it } from "vitest";
import { outcomeFromError, outcomeFromResponse } from "../../src/features/organizer/event-manage/checkinResult";
import { describeDevice } from "../../src/utils/deviceInfo";

describe("check-in result mapping", () => {
  it("reports success only for the SUCCESS code and keeps ticket details", () => {
    const outcome = outcomeFromResponse({ status: "VALID", code: "SUCCESS", ticketTypeName: "VIP", seatName: "A12" });
    expect(outcome).toMatchObject({ tone: "success", code: "SUCCESS", ticketTypeName: "VIP", seatName: "A12" });
  });

  it("does not report success for a ticket that was already used (HTTP 200, DUPLICATED)", () => {
    const outcome = outcomeFromResponse({ status: "DUPLICATED", code: "ALREADY_USED", checkedInAt: "2026-11-14T08:30:00" });
    expect(outcome.tone).toBe("warning");
    expect(outcome.code).toBe("ALREADY_USED");
    expect(outcome.checkedInAt).toBe("2026-11-14T08:30:00");
  });

  it("treats DUPLICATED as already used even when the code is missing", () => {
    expect(outcomeFromResponse({ status: "DUPLICATED" }).code).toBe("ALREADY_USED");
  });

  it("reports a locked ticket (HTTP 200, INVALID) as an error", () => {
    expect(outcomeFromResponse({ status: "INVALID", code: "TICKET_LOCKED" })).toMatchObject({ tone: "error", code: "TICKET_LOCKED" });
    expect(outcomeFromResponse({ status: "INVALID" })).toMatchObject({ tone: "error", code: "TICKET_LOCKED" });
  });

  it("does not report success for an empty or unknown answer", () => {
    expect(outcomeFromResponse(null).tone).toBe("error");
    expect(outcomeFromResponse({ status: "SOMETHING", code: "NEW_CODE" }).code).toBe("UNKNOWN");
  });

  it("maps each business error code of the ticket service", () => {
    for (const code of ["WRONG_EVENT", "WRONG_SHOWTIME", "TICKET_NOT_FOUND", "OUTSIDE_CHECKIN_WINDOW"]) {
      const outcome = outcomeFromError({ response: { status: 400, data: { code } } });
      expect(outcome).toMatchObject({ tone: "error", code });
      expect(outcome.title.length).toBeGreaterThan(0);
    }
  });

  it("maps a 403 to a permission message and anything else to unknown", () => {
    expect(outcomeFromError({ response: { status: 403, data: {} } }).code).toBe("FORBIDDEN");
    expect(outcomeFromError({ response: { status: 500, data: { code: "ERROR" } } }).code).toBe("UNKNOWN");
    expect(outcomeFromError(new Error("Network Error")).code).toBe("UNKNOWN");
    expect(outcomeFromError(null).tone).toBe("error");
  });
});

describe("device description", () => {
  it("names the browser and system", () => {
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36")).toBe("Web Chrome / Windows");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1")).toBe("Web Safari / iOS");
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36")).toBe("Web Chrome / Android");
  });

  it("falls back when the user agent is unknown or empty", () => {
    expect(describeDevice("")).toBe("Web Trình duyệt");
  });
});
