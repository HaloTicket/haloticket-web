// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import "@/i18n";
import { EventMembers } from "@/features/organizer/event-manage/EventMembers";
import { AddMemberModal } from "@/features/organizer/event-manage/components/AddMemberModal";

const api = vi.hoisted(() => ({
  getEventMembers: vi.fn(),
  inviteEventMember: vi.fn(),
  resendEventMemberInvitation: vi.fn(),
  removeEventMember: vi.fn(),
}));
vi.mock("@/services/eventApi", () => ({ eventApi: api }));

const member = (over: Record<string, unknown>) => ({
  id: "m", name: "Người Dùng", email: "x@x.com", role: "MANAGER", status: "ACTIVE", addedAt: "2026-10-01T00:00:00Z", ...over,
});
const owner = member({ id: "o", name: "Chủ", email: "owner@x.com", role: "OWNER" });
const pending = member({ id: "p", name: "Chờ", email: "pending@x.com", status: "PENDING", invitationExpiresAt: "2026-11-01T00:00:00Z" });
const expired = member({ id: "x", name: "Quá hạn", email: "expired@x.com", status: "EXPIRED", invitationExpiresAt: "2026-10-01T00:00:00Z" });
const declined = member({ id: "d", name: "Từ chối", email: "declined@x.com", status: "DECLINED" });
const weird = member({ id: "w", name: "Lạ", email: "weird@x.com", status: "SOMETHING_NEW" });

function renderMembers(myRole = "OWNER") {
  render(
    <MemoryRouter initialEntries={["/organizer/events/e1/manage/members"]}>
      <Routes>
        <Route path="/organizer/events/:eventId/manage" element={<Outlet context={{ myRole }} />}>
          <Route path="members" element={<EventMembers />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()));
afterEach(cleanup);

describe("EventMembers invitation states", () => {
  it("shows the real status of each member, never treating non-ACTIVE as pending", async () => {
    api.getEventMembers.mockResolvedValue([owner, pending, expired, declined, weird]);
    renderMembers();
    await screen.findByText("Chờ");
    const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    expect(within(rowOf("Chờ")).getByText("Chờ chấp nhận")).toBeTruthy();
    expect(within(rowOf("Quá hạn")).getByText("Đã hết hạn")).toBeTruthy();
    expect(within(rowOf("Từ chối")).getByText("Đã từ chối")).toBeTruthy();
    expect(within(rowOf("Lạ")).getByText("Không xác định")).toBeTruthy();
    expect(within(rowOf("Chủ")).getByText("Đã kích hoạt")).toBeTruthy();
  });

  it("shows an error with retry when loading fails", async () => {
    api.getEventMembers.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([owner]);
    renderMembers();
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Chủ")).toBeTruthy();
  });

  it("resends a pending invitation and updates the row from the server result", async () => {
    api.getEventMembers.mockResolvedValue([owner, pending]);
    api.resendEventMemberInvitation.mockResolvedValue({ ...pending, invitationExpiresAt: "2026-12-01T00:00:00Z" });
    renderMembers();
    fireEvent.click(await screen.findByRole("button", { name: "Gửi lại lời mời tới pending@x.com" }));
    await waitFor(() => expect(api.resendEventMemberInvitation).toHaveBeenCalledWith("e1", "p"));
    expect((await screen.findAllByText("Đã gửi lại lời mời.")).length).toBeGreaterThan(0);
  });

  it("offers re-invite for a declined member", async () => {
    api.getEventMembers.mockResolvedValue([owner, declined]);
    api.resendEventMemberInvitation.mockResolvedValue({ ...declined, status: "PENDING" });
    renderMembers();
    fireEvent.click(await screen.findByRole("button", { name: "Mời lại declined@x.com" }));
    await waitFor(() => expect(api.resendEventMemberInvitation).toHaveBeenCalledWith("e1", "d"));
    expect(await screen.findByText("Chờ chấp nhận")).toBeTruthy();
  });

  it("cancels an invitation only after confirmation", async () => {
    api.getEventMembers.mockResolvedValue([owner, pending]);
    api.removeEventMember.mockResolvedValue(undefined);
    renderMembers();
    fireEvent.click(await screen.findByRole("button", { name: "Hủy lời mời gửi tới pending@x.com" }));
    expect(api.removeEventMember).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Hủy lời mời" }));
    await waitFor(() => expect(api.removeEventMember).toHaveBeenCalledWith("e1", "p"));
    await waitFor(() => expect(screen.queryByText("Chờ")).toBeNull());
  });

  it("hides invitation actions from roles that cannot manage members", async () => {
    api.getEventMembers.mockResolvedValue([owner, pending]);
    renderMembers("MANAGER");
    await screen.findByText("Chờ");
    expect(screen.queryByRole("button", { name: /Gửi lại lời mời/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hủy lời mời/ })).toBeNull();
  });

  it("invites through the API and lists the PENDING member returned by the server", async () => {
    api.getEventMembers.mockResolvedValue([owner]);
    api.inviteEventMember.mockResolvedValue(member({ id: "n", name: "Mới", email: "new@x.com", status: "PENDING" }));
    renderMembers();
    fireEvent.click(await screen.findByRole("button", { name: /Thêm thành viên/ }));
    fireEvent.change(screen.getByLabelText("Nhập email *"), { target: { value: "new@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    await waitFor(() => expect(api.inviteEventMember).toHaveBeenCalledWith("e1", "new@x.com", "ADMIN"));
    expect(await screen.findByText("Mới")).toBeTruthy();
  });
});

describe("AddMemberModal", () => {
  it("stays open and shows a translated error when the server rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: "INVITATION_PENDING" } } });
    const onClose = vi.fn();
    render(<AddMemberModal isOpen onClose={onClose} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Nhập email *"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    expect((await screen.findByRole("alert")).textContent).toContain("đã có lời mời đang chờ");
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Nhập email *") as HTMLInputElement).value).toBe("a@b.com");
  });

  it.each([
    [422, "CANNOT_INVITE_OWNER", "chủ sự kiện"],
    [400, "INVALID_EMAIL", "Email không hợp lệ"],
    [403, "FORBIDDEN_ROLE", "không có quyền"],
  ])("maps %i %s to a specific message", async (status, code, text) => {
    const onAdd = vi.fn().mockRejectedValue({ response: { status, data: { message: code } } });
    render(<AddMemberModal isOpen onClose={vi.fn()} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Nhập email *"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    expect((await screen.findByRole("alert")).textContent).toContain(text);
  });

  it("tells the user how many seconds to wait from Retry-After on 429", async () => {
    const onAdd = vi.fn().mockRejectedValue({ response: { status: 429, data: { message: "INVITATION_RATE_LIMITED" }, headers: { "retry-after": "42" } } });
    render(<AddMemberModal isOpen onClose={vi.fn()} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Nhập email *"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    expect((await screen.findByRole("alert")).textContent).toContain("sau 42 giây");
  });

  it("closes on success and on Escape, and blocks Escape while sending", async () => {
    let resolve!: () => void;
    const onAdd = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    const onClose = vi.fn();
    render(<AddMemberModal isOpen onClose={onClose} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Nhập email *"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    expect(await screen.findByRole("button", { name: "Đang gửi lời mời" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    resolve();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
