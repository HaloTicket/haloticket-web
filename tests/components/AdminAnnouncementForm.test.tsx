// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createAnnouncement, getAnnouncement } = vi.hoisted(() => ({
  createAnnouncement: vi.fn(),
  getAnnouncement: vi.fn(),
}));
vi.mock("@/services/notificationApi", () => ({ notificationApi: { createAnnouncement, getAnnouncement } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AdminAnnouncementForm } from "@/features/admin/components/AdminAnnouncementForm";

function confirmSend() {
  fireEvent.click(screen.getByRole("button", { name: "Gửi thông báo" }));
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText("Tất cả tài khoản")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận gửi" }));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("AdminAnnouncementForm", () => {
  it("replays the same normalized payload with the same request ID and changes it after an edit", async () => {
    createAnnouncement.mockRejectedValue(new Error("offline"));
    render(<AdminAnnouncementForm />);
    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "  Bảo trì  " } });
    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "  Vào tối nay  " } });
    fireEvent.click(screen.getByRole("radio", { name: /Quan trọng/ }));

    confirmSend();
    await screen.findByText("Không thể gửi thông báo. Vui lòng thử lại.");
    confirmSend();
    await screen.findByText("Không thể gửi thông báo. Vui lòng thử lại.");
    const first = createAnnouncement.mock.calls[0][0];
    expect(first).toMatchObject({ title: "Bảo trì", message: "Vào tối nay", priority: "IMPORTANT", audience: { kind: "ALL" } });
    expect(createAnnouncement.mock.calls[1][0]).toEqual(first);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Cập nhật" } });
    confirmSend();
    await screen.findByText("Không thể gửi thông báo. Vui lòng thử lại.");
    expect(createAnnouncement.mock.calls[2][0].requestId).not.toBe(first.requestId);
  });

  it("polls a queued announcement and aborts the active poll on unmount", async () => {
    vi.useFakeTimers();
    createAnnouncement.mockResolvedValue({ id: "a-1", status: "QUEUED", recipientCount: 0, deliveredCount: 0 });
    getAnnouncement.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(<AdminAnnouncementForm />);
    fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Bảo trì" } });
    fireEvent.change(screen.getByLabelText("Nội dung"), { target: { value: "Vào tối nay" } });
    confirmSend();
    await act(async () => {});
    expect(screen.getByText("Đang chờ xử lý")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(getAnnouncement).toHaveBeenCalledOnce();
    const [id, signal] = getAnnouncement.mock.calls[0];
    expect(id).toBe("a-1");
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(6000);
    expect(getAnnouncement).toHaveBeenCalledOnce();
  });
});
