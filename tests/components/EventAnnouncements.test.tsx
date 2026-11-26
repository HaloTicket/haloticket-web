// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";

const {
  listEventAnnouncements,
  estimateAnnouncementRecipients,
  createEventAnnouncement,
  resubmitEventAnnouncement,
  getTicketTypesByEventId,
  getEventMembers,
  getEventById,
} = vi.hoisted(() => ({
  listEventAnnouncements: vi.fn(),
  estimateAnnouncementRecipients: vi.fn(),
  createEventAnnouncement: vi.fn(),
  resubmitEventAnnouncement: vi.fn(),
  getTicketTypesByEventId: vi.fn(),
  getEventMembers: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    listEventAnnouncements,
    estimateAnnouncementRecipients,
    createEventAnnouncement,
    resubmitEventAnnouncement,
  },
}));
vi.mock("@/services/ticketApi", () => ({ ticketApi: { getTicketTypesByEventId } }));
vi.mock("@/services/eventApi", () => ({ eventApi: { getEventMembers, getEventById } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));

import { EventAnnouncements } from "@/features/organizer/event-manage/EventAnnouncements";

const historyItem = (overrides = {}) => ({
  id: "a-1",
  eventId: "e-1",
  eventTitle: "GenZania",
  title: "Đổi giờ",
  message: "Mở cửa 18:00",
  category: "EVENT_UPDATE",
  audience: "EVENT_BUYERS",
  target: { group: "CUSTOMER", scope: "ALL" },
  status: "CHANGES_REQUESTED",
  revision: 2,
  submittedAt: "2026-11-26T10:00:00Z",
  reviewReason: "Thêm địa điểm",
  recipientCount: 10,
  deliveredCount: 0,
  ...overrides,
});

function renderPage(eventData: Record<string, unknown> = { title: "GenZania", showtimes: [{ id: "st-1", name: "Suất tối", startTime: "2026-12-01T19:00:00Z" }] }) {
  return render(
    <MemoryRouter initialEntries={["/events/e-1/announcements"]}>
      <Routes>
        <Route path="/events/:eventId" element={<Outlet context={{ myRole: "OWNER", myRoleLoaded: true, eventData }} />}>
          <Route path="announcements" element={<EventAnnouncements />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("EventAnnouncements", () => {
  it("fetches server count, blocks zero/loading sends, and submits customer announcement with target and expectedRecipientCount", async () => {
    listEventAnnouncements.mockResolvedValue({ items: [], total: 0 });
    estimateAnnouncementRecipients.mockResolvedValue({ recipientCount: 42 });
    createEventAnnouncement.mockResolvedValue(historyItem({ status: "PENDING_REVIEW" }));

    renderPage();
    expect(await screen.findByText(/42 người/)).toBeTruthy();
    expect(screen.queryByText(/600/)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /Quảng bá & ưu đãi/ }));
    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "  Early Bird  " } });
    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "  Giảm 20%  " } });
    expect(screen.getByTestId("preview-title").textContent).toBe("Early Bird");

    fireEvent.click(screen.getByRole("button", { name: "Gửi duyệt" }));
    expect(createEventAnnouncement).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/42 người/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận gửi duyệt" }));
    });

    expect(createEventAnnouncement).toHaveBeenCalledWith(
      "e-1",
      {
        requestId: expect.any(String),
        title: "Early Bird",
        message: "Giảm 20%",
        category: "PROMOTION",
        target: { group: "CUSTOMER", scope: "ALL" },
        expectedRecipientCount: 42,
      },
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Đã gửi thông báo để kiểm duyệt.")).toBeTruthy();
  });

  it("switches group cards, adapts PROMOTION <-> INTERNAL while keeping compatible categories, and sends STAFF via Gửi nội bộ using canonical member userId", async () => {
    listEventAnnouncements.mockResolvedValue({ items: [], total: 0 });
    estimateAnnouncementRecipients.mockResolvedValue({ recipientCount: 5 });
    getEventMembers.mockResolvedValue([
      { id: "assign-1", userId: "user-canon-1", name: "Nguyễn Văn A", email: "a@halo.vn", role: "CHECKIN_STAFF", status: "ACTIVE", addedAt: "2026-11-01T00:00:00Z" },
      { id: "assign-2", userId: "user-pending", name: "Chưa nhận", email: "p@halo.vn", role: "MANAGER", status: "PENDING", addedAt: "2026-11-01T00:00:00Z" },
      { id: "assign-3", name: "Thiếu userId", email: "nouid@halo.vn", role: "ADMIN", status: "ACTIVE", addedAt: "2026-11-01T00:00:00Z" },
    ]);
    createEventAnnouncement.mockResolvedValue(historyItem({ status: "QUEUED", category: "INTERNAL", target: { group: "STAFF", scope: "MEMBER", memberId: "user-canon-1" } }));

    renderPage();
    await screen.findByText(/5 người/);

    // Select PROMOTION on CUSTOMER, then switch to STAFF -> auto-switches to INTERNAL
    fireEvent.click(screen.getByRole("radio", { name: /Quảng bá & ưu đãi/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Nhân viên \(STAFF\)/ }));
    expect((screen.getByRole("radio", { name: /Thông báo nội bộ/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole("radio", { name: /Quảng bá & ưu đãi/ })).toBeNull();

    // Check 4 staff scopes in dropdown
    const scopeSelect = screen.getByLabelText(/Phạm vi nhận/) as HTMLSelectElement;
    expect(Array.from(scopeSelect.options).map((o) => o.value)).toEqual(["ALL", "CHECKIN_STAFF", "ROLE", "MEMBER"]);

    // Switch to ROLE and verify localized role labels
    fireEvent.change(scopeSelect, { target: { value: "ROLE" } });
    const roleSelect = screen.getByLabelText(/Chọn vai trò nhân sự/) as HTMLSelectElement;
    expect(Array.from(roleSelect.options).map((o) => o.text)).toContain("Nhân viên check-in");
    expect(Array.from(roleSelect.options).map((o) => o.text)).toContain("Chủ sự kiện");

    // Switch to MEMBER -> only active members with canonical userId appear
    fireEvent.change(scopeSelect, { target: { value: "MEMBER" } });
    const memberSelect = await screen.findByLabelText(/Chọn thành viên/) as HTMLSelectElement;
    await waitFor(() => expect(memberSelect.options.length).toBe(2));
    expect(memberSelect.options[1].value).toBe("user-canon-1");
    expect(memberSelect.options[1].text).toContain("Nguyễn Văn A");
    expect(memberSelect.options[1].text).toContain("Nhân viên check-in");

    // Submit disabled until member selected
    const submitBtn = screen.getByRole("button", { name: "Gửi nội bộ" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    estimateAnnouncementRecipients.mockResolvedValueOnce({ recipientCount: 1 });
    fireEvent.change(memberSelect, { target: { value: "user-canon-1" } });
    expect(await screen.findByText(/1 người/)).toBeTruthy();
    expect(submitBtn.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Họp soát vé" } });
    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "Có mặt lúc 17h" } });
    fireEvent.click(submitBtn);

    const dialog = screen.getByRole("alertdialog");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận gửi nội bộ" }));
    });

    expect(createEventAnnouncement).toHaveBeenCalledWith(
      "e-1",
      expect.objectContaining({
        category: "INTERNAL",
        target: { group: "STAFF", scope: "MEMBER", memberId: "user-canon-1" },
        expectedRecipientCount: 1,
      }),
      expect.any(AbortSignal),
    );
    expect(await screen.findByText("Đã đưa thông báo nội bộ vào hàng đợi gửi.")).toBeTruthy();
  });

  it("aborts stale recipient-count requests on scope changes, handles error/retry and blocks zero recipients", async () => {
    listEventAnnouncements.mockResolvedValue({ items: [], total: 0 });
    getTicketTypesByEventId.mockResolvedValue([{ id: "tt-1", name: "VIP", eventId: "e-1", price: 100000, isFree: false, totalQuantity: 50, minPerOrder: 1, maxPerOrder: 5, status: "ACTIVE" }]);
    const signals: AbortSignal[] = [];
    estimateAnnouncementRecipients
      .mockImplementationOnce((_e, _t, signal) => { signals.push(signal); return new Promise(() => {}); })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ recipientCount: 0 });

    renderPage();
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    // Check 5 customer scopes
    const scopeSelect = screen.getByLabelText(/Phạm vi nhận/) as HTMLSelectElement;
    expect(Array.from(scopeSelect.options).map((o) => o.value)).toEqual(["ALL", "TICKET_TYPE", "SHOWTIME", "CHECKED_IN", "NOT_CHECKED_IN"]);

    // Switching scope aborts in-flight count request
    fireEvent.change(scopeSelect, { target: { value: "CHECKED_IN" } });
    expect(signals[0].aborted).toBe(true);

    // Error state shows retry button and keeps submit disabled
    expect(await screen.findByText(/Không thể tính số người nhận/)).toBeTruthy();
    const submitBtn = screen.getByRole("button", { name: "Gửi duyệt" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // Retry returns 0 -> blocks send
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText(/0 người/)).toBeTruthy();
    expect(submitBtn.disabled).toBe(true);
  });

  it("shows 409 conflict and refreshes recipient count without losing the draft", async () => {
    listEventAnnouncements.mockResolvedValue({ items: [], total: 0 });
    estimateAnnouncementRecipients
      .mockResolvedValueOnce({ recipientCount: 10 })
      .mockResolvedValueOnce({ recipientCount: 12 });
    createEventAnnouncement.mockRejectedValueOnce({ response: { status: 409 } });

    renderPage();
    expect(await screen.findByText(/10 người/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Cập nhật cổng" } });
    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "Cổng B mở cửa" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi duyệt" }));

    await act(async () => {
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xác nhận gửi duyệt" }));
    });

    expect(await screen.findByText(/409/)).toBeTruthy();
    expect(await screen.findByText(/12 người/)).toBeTruthy();
    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Cập nhật cổng");
  });

  it("retains the original target when editing and resubmitting a CHANGES_REQUESTED customer revision", async () => {
    const scopedItem = historyItem({
      target: { group: "CUSTOMER", scope: "SHOWTIME", showtimeId: "st-1" },
    });
    listEventAnnouncements.mockResolvedValue({ items: [scopedItem], total: 1 });
    estimateAnnouncementRecipients.mockResolvedValue({ recipientCount: 8 });
    resubmitEventAnnouncement.mockResolvedValue(historyItem({ status: "PENDING_REVIEW", revision: 3 }));

    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử gửi" }));
    expect(await screen.findByText("Thêm địa điểm")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa & gửi lại" }));
    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Đổi giờ");
    expect((screen.getByLabelText(/Phạm vi nhận/) as HTMLSelectElement).value).toBe("SHOWTIME");
    expect((screen.getByLabelText(/Chọn suất diễn/) as HTMLSelectElement).value).toBe("st-1");
    expect(await screen.findByText(/8 người/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "Mở cửa 17:30 tại Hall A" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại để kiểm duyệt" }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xác nhận gửi duyệt" }));
    });

    expect(resubmitEventAnnouncement).toHaveBeenCalledWith(
      "e-1",
      "a-1",
      {
        revision: 2,
        title: "Đổi giờ",
        message: "Mở cửa 17:30 tại Hall A",
        category: "EVENT_UPDATE",
        target: { group: "CUSTOMER", scope: "SHOWTIME", showtimeId: "st-1" },
        expectedRecipientCount: 8,
      },
      expect.any(AbortSignal),
    );
  });
});
