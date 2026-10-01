// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { preferenceKey, readAdminPreferences } from "./adminPreferences";
import AdminSettings from "./AdminSettings";

vi.mock("@/services/userApi", () => ({ getCachedUserProfile: () => ({ id: "account-one", fullName: "Admin", email: "admin@example.com" }) }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "system", setTheme: vi.fn() }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: "vi" } }) }));
vi.mock("@/i18n", () => ({ setLanguage: vi.fn() }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("admin browser settings", () => {
  it("persists account privacy and notification switches and masks the profile", () => {
    render(<AdminSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Quyền riêng tư" }));
    const privacy = screen.getByRole("switch", { name: "Ẩn email trong giao diện quản trị" });
    fireEvent.click(privacy);
    expect(privacy.getAttribute("aria-checked")).toBe("true");
    expect(readAdminPreferences("account-one").preferences.hideEmail).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Thông báo" }));
    const notification = screen.getByRole("switch", { name: "Thông báo tức thời" });
    fireEvent.click(notification);
    expect(readAdminPreferences("account-one").preferences.instantNotifications).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Hồ sơ" }));
    expect(screen.queryByText("admin@example.com")).toBeNull();
    expect(screen.getByText("••••••")).toBeTruthy();
  });

  it("falls back from malformed saved data, reports it, and repairs on change", () => {
    localStorage.setItem(preferenceKey("account-one"), "{bad");
    render(<AdminSettings />);
    expect(screen.getByRole("alert").textContent).toContain("không hợp lệ");
    fireEvent.click(screen.getByRole("button", { name: "Quyền riêng tư" }));
    fireEvent.click(screen.getByRole("switch", { name: "Ẩn email trong giao diện quản trị" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(readAdminPreferences("account-one").preferences.hideEmail).toBe(true);
    expect(readAdminPreferences("another-account").preferences.hideEmail).toBe(false);
  });

  it("reports a browser storage failure without claiming the toggle was saved", () => {
    const storageWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    try {
      render(<AdminSettings />);
      fireEvent.click(screen.getByRole("button", { name: "Quyền riêng tư" }));
      fireEvent.click(screen.getByRole("switch", { name: "Ẩn email trong giao diện quản trị" }));
      expect(screen.getByRole("alert").textContent).toContain("Không thể lưu");
      expect(screen.getByRole("switch", { name: "Ẩn email trong giao diện quản trị" }).getAttribute("aria-checked")).toBe("false");
    } finally {
      storageWrite.mockRestore();
    }
  });
});
