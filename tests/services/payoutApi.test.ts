import { afterEach, describe, expect, it, vi } from "vitest";
import axiosClient from "@/services/axiosClient";
import { payoutApi } from "@/services/payoutApi";

vi.mock("@/services/axiosClient", () => ({ default: { get: vi.fn() } }));

afterEach(() => vi.clearAllMocks());

describe("payoutApi organizer detail adapter", () => {
  it("maps backend timeline and payout account snapshot aliases", async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({
      id: "payout-123",
      eventId: "event-1",
      organizerUserId: "organizer-1",
      grossAmount: 1_000_000,
      platformFee: 50_000,
      netAmount: 950_000,
      status: "PENDING",
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
      bankNameSnapshot: "Halo Bank",
      accountHolderSnapshot: "Nguyen Van A",
      maskedAccountNumber: "•••• 1234",
      allowedActions: ["CANCEL"],
      timeline: [
        { at: "2026-10-30T10:00:00Z", reason: "Yêu cầu đã được ghi nhận" },
        { at: "not-a-date", reason: "Bỏ qua bản ghi thiếu thời gian" },
      ],
    });

    const detail = await payoutApi.getOrganizerPayout("payout-123");

    expect(axiosClient.get).toHaveBeenCalledWith("/payouts/organizer/payout-123");
    expect(detail.accountSnapshot).toEqual({ bankName: "Halo Bank", accountHolder: "Nguyen Van A", accountNumberMasked: "•••• 1234" });
    expect(detail.timeline).toEqual([{ status: "", occurredAt: "2026-10-30T10:00:00Z", publicMessage: "Yêu cầu đã được ghi nhận" }]);
  });
});
