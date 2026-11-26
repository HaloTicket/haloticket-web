// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { listModeration, moderateAnnouncement } = vi.hoisted(() => ({ listModeration: vi.fn(), moderateAnnouncement: vi.fn() }));
vi.mock("@/services/notificationApi", () => ({ notificationApi: { listModeration, moderateAnnouncement } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));

import { AdminAnnouncementModeration } from "@/features/admin/components/AdminAnnouncementModeration";

const item = (overrides = {}) => ({
  id: "a-1", eventId: "e-1", eventTitle: "GenZania Festival", title: "Ưu đãi Early Bird", message: "Giảm 20%", category: "PROMOTION",
  audience: "EVENT_BUYERS", status: "PENDING_REVIEW", revision: 3, submittedAt: "2026-11-26T13:57:00Z", recipientCount: 42, deliveredCount: 0, ...overrides,
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("AdminAnnouncementModeration", () => {
  it("shows live scan data, requires a reason, sends the revision and refreshes", async () => {
    listModeration.mockResolvedValue({ items: [item({ scan: { status: "COMPLETE", score: 8, level: "LOW", findings: ["Không có từ nhạy cảm"] } })], total: 1 });
    moderateAnnouncement.mockResolvedValue(item({ status: "CHANGES_REQUESTED" }));
    const onPendingChange = vi.fn();
    render(<AdminAnnouncementModeration onPendingChange={onPendingChange} />);

    await screen.findByRole("heading", { name: "Ưu đãi Early Bird", level: 2 });
    expect(screen.getByText("Rủi ro thấp")).toBeTruthy();
    expect(screen.getByText("Điểm: 8 / 100")).toBeTruthy();
    expect(screen.getByText("Không có từ nhạy cảm")).toBeTruthy();
    expect(onPendingChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Yêu cầu chỉnh sửa" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Yêu cầu chỉnh sửa" }));
    expect(await within(dialog).findByText("Hãy nhập lý do để gửi cho Ban tổ chức.")).toBeTruthy();
    expect(moderateAnnouncement).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Lý do gửi Ban tổ chức/), { target: { value: "  Sửa tiêu đề  " } });
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Yêu cầu chỉnh sửa" })); });
    expect(moderateAnnouncement).toHaveBeenCalledWith("a-1", { revision: 3, action: "REQUEST_CHANGES", reason: "Sửa tiêu đề" }, expect.any(AbortSignal));
    expect(listModeration).toHaveBeenCalledTimes(2);
  });

  it("states clearly when scanning is unavailable and approves without a reason", async () => {
    listModeration.mockResolvedValue({ items: [item({ scan: { status: "UNAVAILABLE" } })], total: 1 });
    moderateAnnouncement.mockResolvedValue(item({ status: "QUEUED" }));
    render(<AdminAnnouncementModeration />);
    await screen.findByRole("heading", { name: "Ưu đãi Early Bird", level: 2 });
    expect(screen.getByRole("heading", { name: "Kết quả quét nội dung HaloTicket" })).toBeTruthy();
    expect(screen.getByText(/Chưa có kết quả quét nội dung tự động/)).toBeTruthy();
    expect(screen.queryByText(/SensiScan/i)).toBeNull();
    expect(screen.queryByText(/Điểm:/)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Thông tin gửi" }));
    expect(screen.getByText("Tất cả khách hàng của sự kiện")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Duyệt & gửi" }));
    await act(async () => { fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Duyệt & gửi" })); });
    expect(moderateAnnouncement).toHaveBeenCalledWith("a-1", { revision: 3, action: "APPROVE" }, expect.any(AbortSignal));
  });

  it("shows the real target in moderation detail for scoped customer announcements", async () => {
    listModeration.mockResolvedValue({
      items: [item({ target: { group: "CUSTOMER", scope: "TICKET_TYPE", ticketTypeId: "tt-vip" }, recipientCount: 15 })],
      total: 1,
    });
    render(<AdminAnnouncementModeration />);
    await screen.findByRole("heading", { name: "Ưu đãi Early Bird", level: 2 });

    fireEvent.click(screen.getByRole("tab", { name: "Thông tin gửi" }));
    expect(screen.getByText("Khách theo hạng vé: tt-vip")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("aborts the in-flight list request on unmount", async () => {
    let signal: AbortSignal | undefined;
    listModeration.mockImplementation((_page, _size, _q, s) => { signal = s; return new Promise(() => {}); });
    const { unmount } = render(<AdminAnnouncementModeration />);
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
