// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { preferenceKey, readAdminPreferences } from "./adminPreferences";
import AdminSettings from "./AdminSettings";

vi.mock("@/services/userApi", () => ({
  getCachedUserProfile: () => ({ id: "account-one", fullName: "Admin", email: "admin@example.com" }),
  userApi: { syncCurrentUser: vi.fn().mockRejectedValue(new Error("offline")) },
}));
vi.mock("@/services/ekycApi", () => ({ ekycApi: { getStatus: vi.fn().mockRejectedValue(new Error("offline")) } }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "system", setTheme: vi.fn() }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: "vi" } }) }));
vi.mock("@/i18n", () => ({ setLanguage: vi.fn() }));

function show(path = "/admin/settings/profile") {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/admin/settings/:section" element={<AdminSettings />} />
  </Routes></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("admin settings", () => {
  it("exposes all six sections at persistent URLs", () => {
    show();
    const nav = screen.getByRole("navigation", { name: "Mục cài đặt" });
    expect(nav.querySelectorAll("a")).toHaveLength(6);
    const routes = ["profile", "account-security", "appearance", "privacy", "notifications", "messages"];
    for (const route of routes) expect(nav.querySelector(`a[href="/admin/settings/${route}"]`)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Giao diện" }));
    expect(screen.getByRole("heading", { name: "Chủ đề giao diện" })).toBeTruthy();
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("migrates old preferences and persists browser switches", () => {
    localStorage.setItem(preferenceKey("account-one"), JSON.stringify({ hideEmail: false, instantNotifications: true }));
    show("/admin/settings/privacy");
    expect(readAdminPreferences("account-one").preferences.spellCheck).toBe(true);
    const privacy = screen.getByRole("switch", { name: "Ẩn email cá nhân với người dùng" });
    fireEvent.click(privacy);
    expect(privacy.getAttribute("aria-checked")).toBe("true");
    expect(readAdminPreferences("account-one").preferences.hideEmail).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: "Ghi nhật ký hoạt động quản trị" }));
    expect(readAdminPreferences("account-one").preferences.activityLogPreview).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "Thông báo" }));
    fireEvent.click(screen.getByRole("switch", { name: "Thông báo tức thời" }));
    expect(readAdminPreferences("account-one").preferences.instantNotifications).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "Tin nhắn" }));
    fireEvent.click(screen.getByRole("switch", { name: "Tự động trả lời khi vắng mặt" }));
    expect(readAdminPreferences("account-one").preferences.autoReply).toBe(true);
  });

  it("reports malformed or blocked storage without claiming a save", () => {
    localStorage.setItem(preferenceKey("account-one"), "{bad");
    show("/admin/settings/privacy");
    expect(screen.getByRole("alert").textContent).toContain("không hợp lệ");
    fireEvent.click(screen.getByRole("switch", { name: "Ẩn email cá nhân với người dùng" }));
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();
    const storageWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    try {
      show("/admin/settings/privacy");
      fireEvent.click(screen.getByRole("switch", { name: "Ẩn email cá nhân với người dùng" }));
      expect(screen.getByRole("alert").textContent).toContain("Không thể lưu");
      expect(screen.getByRole("switch", { name: "Ẩn email cá nhân với người dùng" }).getAttribute("aria-checked")).toBe("true");
    } finally {
      storageWrite.mockRestore();
    }
  });
});
