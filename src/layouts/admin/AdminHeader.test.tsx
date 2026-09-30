// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createRef } from "react";

import { AdminHeader } from "./AdminHeader";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value, i18n: { language: "vi" } }) }));
vi.mock("@/components/common/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("@/components/notifications/NotificationDropdown", () => ({ NotificationDropdown: () => null }));

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

function renderHeader(path: string) {
  render(<MemoryRouter initialEntries={[path]}>
    <LocationProbe />
    <AdminHeader collapsed={false} onToggleCollapse={vi.fn()} isDark={false} toggleTheme={vi.fn()} userProfile={null} notifications={[]} unreadCount={0} showProfileMenu={false} onToggleProfileMenu={vi.fn()} onCloseProfileMenu={vi.fn()} onMobileOpen={vi.fn()} mobileMenuButtonRef={createRef<HTMLButtonElement>()} onMarkAllAsRead={vi.fn()} onNotificationClick={vi.fn()} onLogout={vi.fn()} />
  </MemoryRouter>);
}

afterEach(cleanup);

describe("admin header event search", () => {
  it("searches all approval events from another page", () => {
    renderHeader("/admin/dashboard");
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm sự kiện cần kiểm duyệt" }), { target: { value: "Hội nhạc" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=ALL&q=H%E1%BB%99i+nh%E1%BA%A1c");
  });

  it("keeps the approval status and resets pagination", () => {
    renderHeader("/admin/events-approval?status=APPROVED&page=3&q=old");
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm sự kiện cần kiểm duyệt" }), { target: { value: "new" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=APPROVED&q=new");
  });
});
