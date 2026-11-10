// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const approveEvent = vi.fn();
const rejectEvent = vi.fn();
const analyzeRiskScore = vi.fn();
const recordRiskDecision = vi.fn();
const toastError = vi.fn();

vi.mock("@/services/eventApi", () => ({ eventApi: { approveEvent: (...a: unknown[]) => approveEvent(...a), rejectEvent: (...a: unknown[]) => rejectEvent(...a) } }));
vi.mock("@/services/aiApi", () => ({
  aiApi: { analyzeRiskScore: (...a: unknown[]) => analyzeRiskScore(...a), recordRiskDecision: (...a: unknown[]) => recordRiskDecision(...a) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a), info: vi.fn() } }));

import "@/i18n";
import { EventApprovalActions } from "@/features/admin/events/EventApprovalActions";
import type { ApprovalEventItem } from "@/types";

const event = { id: "ev1", title: "Đêm nhạc", description: "Mô tả", organizerName: "BTC", eventApprovalStatus: "PENDING" } as ApprovalEventItem;

beforeEach(() => {
  approveEvent.mockReset().mockResolvedValue({});
  rejectEvent.mockReset().mockResolvedValue({});
  analyzeRiskScore.mockReset();
  recordRiskDecision.mockReset().mockResolvedValue(true);
  toastError.mockReset();
});
afterEach(() => cleanup());

describe("EventApprovalActions", () => {
  it("records the approval for the risk comparison after it succeeded", async () => {
    const onSuccess = vi.fn();
    render(<EventApprovalActions event={event} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Phê duyệt sự kiện" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận phê duyệt" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(approveEvent).toHaveBeenCalledWith("ev1");
    expect(recordRiskDecision).toHaveBeenCalledWith("ev1", "APPROVED", "");
  });

  it("records the rejection with its reason", async () => {
    render(<EventApprovalActions event={event} onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Từ chối duyệt" }));
    fireEvent.change(await screen.findByPlaceholderText("Nhập lý do từ chối (bắt buộc)..."), { target: { value: "Có số điện thoại" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));
    await waitFor(() => expect(recordRiskDecision).toHaveBeenCalledWith("ev1", "REJECTED", "Có số điện thoại"));
  });

  it("does not record anything, and does not lose the dialog, when the approval itself fails", async () => {
    approveEvent.mockRejectedValueOnce(new Error("boom"));
    const onSuccess = vi.fn();
    render(<EventApprovalActions event={event} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Phê duyệt sự kiện" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận phê duyệt" }));
    await screen.findByRole("alert");
    expect(recordRiskDecision).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("stays silent when the decision record cannot be saved: the approval still completes and no error is shown", async () => {
    recordRiskDecision.mockResolvedValue(false);
    const onSuccess = vi.fn();
    render(<EventApprovalActions event={event} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Phê duyệt sự kiện" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận phê duyệt" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("writes the AI reasons one per line with a real newline, skipping items that found nothing", async () => {
    analyzeRiskScore.mockResolvedValueOnce({
      risk_score: 70, risk_level: "HIGH", reasons: ["ignored plain list"],
      reason_items: [
        { layer: "RULE", code: "contact_phone", weight: 25, message: "Có số điện thoại.", evidence: [] },
        { layer: "SIGNAL", code: "UNAVAILABLE:near_duplicate", weight: 0, status: "not_assessed", message: "Không đánh giá được.", evidence: [] },
        { layer: "AI", code: "SCAM_PATTERN", weight: 20, message: "Có dấu hiệu lừa đảo.", evidence: [] },
      ],
    });
    render(<EventApprovalActions event={event} onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Từ chối duyệt" }));
    fireEvent.click(await screen.findByText("Để AI tự động viết"));
    const textarea = (await screen.findByPlaceholderText("Nhập lý do từ chối (bắt buộc)...")) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe("Có số điện thoại.\nCó dấu hiệu lừa đảo."));
    expect(textarea.value).not.toContain("\\n");
  });

  it("falls back to the plain reasons of the old contract", async () => {
    analyzeRiskScore.mockResolvedValueOnce({ risk_score: 70, risk_level: "HIGH", reasons: ["Lý do một", "Lý do hai"] });
    render(<EventApprovalActions event={event} onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Từ chối duyệt" }));
    fireEvent.click(await screen.findByText("Để AI tự động viết"));
    const textarea = (await screen.findByPlaceholderText("Nhập lý do từ chối (bắt buộc)...")) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe("Lý do một\nLý do hai"));
  });

  describe("quotes for the organiser", () => {
    const items = [
      { layer: "RULE", code: "prohibited_goods", weight: 60, message: "Bán hàng cấm.", evidence: [{ field: "description", text: "bán vũ khí" }, { field: "title", text: "Show vũ khí" }] },
      { layer: "AI", code: "SCAM_PATTERN", weight: 20, message: "Lừa đảo.", evidence: [{ field: "description", text: "đặt cọc trước" }] },
      { layer: "SIGNAL", code: "UNAVAILABLE:x", weight: 0, status: "not_assessed", message: "?", evidence: [{ field: "description", text: "không gửi" }] },
    ] as never;

    const openReject = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Từ chối duyệt" }));
      await screen.findByPlaceholderText("Nhập lý do từ chối (bắt buộc)...");
    };
    const confirmReject = async () => {
      fireEvent.change(screen.getByPlaceholderText("Nhập lý do từ chối (bắt buộc)..."), { target: { value: "Lý do" } });
      fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));
      await waitFor(() => expect(rejectEvent).toHaveBeenCalled());
      return JSON.parse(rejectEvent.mock.calls[0][2] as string);
    };

    it("sends only the quotes that stay checked and derives the sections from the evidence", async () => {
      render(<EventApprovalActions event={event} riskItems={items} onSuccess={() => {}} />);
      await openReject();
      expect(screen.getByText("Đoạn nội dung sẽ gửi kèm cho ban tổ chức")).toBeTruthy();
      expect(screen.queryByText("không gửi")).toBeNull(); // not assessed: never offered
      fireEvent.click(screen.getByRole("checkbox", { name: /đặt cọc trước/ })); // the admin unchecks one
      const notes = await confirmReject();
      expect(notes.flaggedFields).toEqual(["title"]);
      expect(notes.flaggedQuotes).toEqual([{ field: "description", text: "bán vũ khí" }, { field: "title", text: "Show vũ khí" }]);
    });

    it("keeps the admin's own choice of sections once they changed it", async () => {
      render(<EventApprovalActions event={event} riskItems={items} onSuccess={() => {}} />);
      await openReject();
      fireEvent.click(screen.getByRole("checkbox", { name: "Poster & Banner" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Tên & Mô tả sự kiện" }));
      const notes = await confirmReject();
      expect(notes.flaggedFields).toEqual(["posterImage"]);
    });

    it("without risk data the section is hidden and the notes keep their old shape", async () => {
      render(<EventApprovalActions event={event} onSuccess={() => {}} />);
      await openReject();
      expect(screen.queryByText("Đoạn nội dung sẽ gửi kèm cho ban tổ chức")).toBeNull();
      const notes = await confirmReject();
      expect(notes).toEqual({ flaggedFields: ["posterImage"], noteText: "" });
    });

    it("with evidence that is not in the title or description it suggests no section by default and sends no quotes", async () => {
      const onlySignal = [{ layer: "SIGNAL", code: "organizer_ekyc", weight: 15, message: "eKYC", evidence: [{ field: "organizer", text: "eKYC: PENDING" }] }] as never;
      render(<EventApprovalActions event={event} riskItems={onlySignal} onSuccess={() => {}} />);
      await openReject();
      expect(screen.queryByText("Đoạn nội dung sẽ gửi kèm cho ban tổ chức")).toBeNull();
      const notes = await confirmReject();
      expect(notes).toEqual({ flaggedFields: [], noteText: "" });
    });
  });
});
