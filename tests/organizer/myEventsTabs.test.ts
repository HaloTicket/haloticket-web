import { describe, expect, it } from "vitest";
import { getEventTabStatus } from "../../src/features/organizer/myEventsTabs";

const NOW = new Date("2026-12-02T10:00:00");

describe("getEventTabStatus", () => {
  it("sự kiện bị từ chối có tab riêng, kể cả khi ngày diễn ra đã qua", () => {
    expect(getEventTabStatus({ eventApprovalStatus: "REJECTED" }, NOW)).toBe("rejected");
    expect(getEventTabStatus({ eventApprovalStatus: "REJECTED", endTime: "2026-01-01T10:00:00" }, NOW)).toBe("rejected");
  });

  it("sự kiện đã kết thúc vào tab đã qua", () => {
    expect(getEventTabStatus({ eventApprovalStatus: "APPROVED", endTime: "2026-11-01T10:00:00" }, NOW)).toBe("past");
    expect(getEventTabStatus({ eventStatus: "COMPLETED" }, NOW)).toBe("past");
  });

  it("chờ duyệt và chờ duyệt cập nhật cùng một tab; nháp và đã duyệt đúng tab", () => {
    expect(getEventTabStatus({ eventApprovalStatus: "PENDING" }, NOW)).toBe("pending");
    expect(getEventTabStatus({ eventApprovalStatus: "UPDATE_PENDING" }, NOW)).toBe("pending");
    expect(getEventTabStatus({ eventApprovalStatus: "DRAFT" }, NOW)).toBe("draft");
    expect(getEventTabStatus({ eventApprovalStatus: "APPROVED", endTime: "2026-12-20T10:00:00" }, NOW)).toBe("upcoming");
  });

  it("trạng thái lạ hoặc thiếu coi là chờ duyệt", () => {
    expect(getEventTabStatus({}, NOW)).toBe("pending");
    expect(getEventTabStatus({ eventApprovalStatus: "WHATEVER" }, NOW)).toBe("pending");
  });
});
