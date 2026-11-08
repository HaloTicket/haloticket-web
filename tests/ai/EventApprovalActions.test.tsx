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
});
