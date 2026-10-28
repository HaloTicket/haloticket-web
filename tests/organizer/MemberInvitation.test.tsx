// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { MEMBER_INVITATION_TOKEN_KEY, MEMBER_INVITATION_TOKEN_TTL_MS, clearMemberInvitationToken, saveMemberInvitationToken } from "@/services/memberInvitationToken";
import MemberInvitation from "@/features/organizer/event-manage/MemberInvitation";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  preview: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({ isAuthenticated: () => mocks.authenticated, logout: mocks.logout }),
}));
vi.mock("@/services/eventApi", () => ({
  eventApi: {
    previewMemberInvitation: mocks.preview,
    acceptMemberInvitation: mocks.accept,
    declineMemberInvitation: mocks.decline,
  },
}));

const invitation = { eventId: "e1", eventTitle: "Đêm nhạc Halo", role: "MANAGER", expiresAt: "2026-11-01T10:00:00Z", state: "PENDING" };
const httpError = (status: number, message: string) => ({ response: { status, data: { message } } });

function renderPage(url = "/event-invitations/accept#token=SECRET123") {
  window.history.replaceState(null, "", url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/event-invitations/accept" element={<MemberInvitation />} />
        <Route path="*" element={<p>other</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.authenticated = true;
  mocks.preview.mockReset();
  mocks.accept.mockReset();
  mocks.decline.mockReset();
  mocks.logout.mockReset().mockResolvedValue(undefined);
  sessionStorage.clear();
});
afterEach(cleanup);

describe("member invitation page", () => {
  it("asks anonymous visitors to sign in, keeps the token for the return trip and does not call the API", () => {
    mocks.authenticated = false;
    renderPage();
    expect(screen.getByRole("link", { name: "Thiết lập mật khẩu" }).getAttribute("href")).toBe("/forgot-password");
    fireEvent.click(screen.getByRole("link", { name: "Đăng nhập" }));
    expect(sessionStorage.getItem("haloticket_auth_redirect")).toBe("/event-invitations/accept");
    expect(sessionStorage.getItem("haloticket_auth_redirect")).not.toContain("SECRET123");
    expect(JSON.parse(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)!).token).toBe("SECRET123");
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("restores the token from sessionStorage after sign-in (no hash in the URL)", async () => {
    saveMemberInvitationToken("SAVED456");
    mocks.preview.mockResolvedValue(invitation);
    renderPage("/event-invitations/accept");
    await screen.findByText("Đêm nhạc Halo");
    expect(mocks.preview).toHaveBeenCalledWith("SAVED456");
  });

  it("ignores a stored token older than 30 minutes", () => {
    saveMemberInvitationToken("OLD", Date.now() - MEMBER_INVITATION_TOKEN_TTL_MS - 1000);
    renderPage("/event-invitations/accept");
    expect(screen.getByText(/thiếu mã/)).toBeTruthy();
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("no longer accepts ?token= in the query string", () => {
    renderPage("/event-invitations/accept?token=SECRET123");
    expect(screen.getByText(/thiếu mã/)).toBeTruthy();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
  });

  it("session logout removes the stored invitation token", async () => {
    const { createKeycloakSession } = await vi.importActual<typeof import("@/services/keycloakSession")>("@/services/keycloakSession");
    saveMemberInvitationToken("X");
    const session = createKeycloakSession({
      keycloak: { authenticated: false, init: vi.fn(), login: vi.fn(), createLoginUrl: vi.fn(), updateToken: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) },
      storage: { getItem: () => null, removeItem: vi.fn() },
      location: { origin: "https://x.test" },
    });
    await session.logout();
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
  });

  it("clearMemberInvitationToken removes the stored token (used by logout)", () => {
    saveMemberInvitationToken("X");
    clearMemberInvitationToken();
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
  });

  it("removes the token from the address bar but still uses it", async () => {
    mocks.preview.mockResolvedValue(invitation);
    renderPage();
    await screen.findByText("Đêm nhạc Halo");
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/event-invitations/accept");
    expect(window.location.href).not.toContain("SECRET123");
    expect(mocks.preview).toHaveBeenCalledWith("SECRET123");
  });

  it("shows the real invitation details", async () => {
    mocks.preview.mockResolvedValue(invitation);
    renderPage();
    expect(await screen.findByText("Đêm nhạc Halo")).toBeTruthy();
    expect(screen.getByText("Quản lý")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Chấp nhận" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Từ chối" })).toBeTruthy();
  });

  it("shows the generic message for a 404", async () => {
    mocks.preview.mockRejectedValue(httpError(404, "INVITATION_NOT_FOUND"));
    renderPage();
    expect(await screen.findByText("Lời mời không hợp lệ, đã hết hạn hoặc không thuộc tài khoản này.")).toBeTruthy();
    expect(screen.getByText(/đúng tài khoản nhận lời mời/)).toBeTruthy();
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất / đổi tài khoản" }));
    expect(mocks.logout).toHaveBeenCalledWith(`${window.location.origin}/login`);
  });

  it("keeps the stored token after a temporary failure so retry still works", async () => {
    mocks.preview.mockRejectedValueOnce(httpError(500, "boom"));
    renderPage();
    await screen.findByRole("button", { name: "Thử lại" });
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).not.toBeNull();
  });

  it("shows a retryable error for a server failure", async () => {
    mocks.preview.mockRejectedValueOnce(httpError(500, "boom")).mockResolvedValueOnce(invitation);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Đêm nhạc Halo")).toBeTruthy();
  });

  it("accepts and links to the event management page", async () => {
    mocks.preview.mockResolvedValue(invitation);
    mocks.accept.mockResolvedValue({ eventId: "e1", role: "MANAGER" });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Chấp nhận" }));
    const link = await screen.findByRole("link", { name: "Mở trang quản lý sự kiện" });
    expect(link.getAttribute("href")).toBe("/organizer/events/e1/manage");
    expect(mocks.accept).toHaveBeenCalledWith("SECRET123");
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
  });

  it("declines and confirms it", async () => {
    mocks.preview.mockResolvedValue(invitation);
    mocks.decline.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Từ chối" }));
    expect(await screen.findByText("Đã từ chối lời mời")).toBeTruthy();
    expect(mocks.decline).toHaveBeenCalledWith("SECRET123");
    expect(sessionStorage.getItem(MEMBER_INVITATION_TOKEN_KEY)).toBeNull();
  });

  it("reports an accept failure as an error instead of success", async () => {
    mocks.preview.mockResolvedValue(invitation);
    mocks.accept.mockRejectedValue(httpError(404, "INVITATION_NOT_FOUND"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Chấp nhận" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Bạn đã tham gia ban tổ chức")).toBeNull();
  });
});
