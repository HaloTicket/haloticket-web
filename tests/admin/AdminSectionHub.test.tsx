// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminBreadcrumb } from "@/layouts/admin/AdminBreadcrumb";
import AdminSectionHub from "@/features/admin/AdminSectionHub";
import { adminNavGroups, resolveAdminNavigation } from "@/layouts/admin/adminNavigation";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));
afterEach(cleanup);

describe("admin section navigation", () => {
  it("opens the event workspace through its breadcrumb and returns to venue management", () => {
    render(<MemoryRouter initialEntries={["/admin/events-approval"]}><AdminBreadcrumb /><Routes>
      <Route path="/admin/events-approval" element={<h1>Hàng chờ sự kiện</h1>} />
      <Route path="/admin/events" element={<AdminSectionHub />} />
      <Route path="/admin/venues" element={<h1>Danh sách địa điểm</h1>} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("link", { name: "Quản lý sự kiện" }));
    expect(screen.getByRole("heading", { name: "Quản lý sự kiện", level: 1 })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Báo cáo & thống kê/ }).getAttribute("href")).toBe("/admin/events/reports");
    fireEvent.click(screen.getByRole("link", { name: /Quản lý địa điểm/ }));
    expect(screen.getByRole("heading", { name: "Danh sách địa điểm" })).toBeTruthy();
  });

  it("resolves every destination to its correct group with unique paths", () => {
    expect(adminNavGroups).toHaveLength(9);
    const items = adminNavGroups.flatMap((group) => group.items);
    expect(new Set(items.map((item) => item.path)).size).toBe(items.length);
    for (const group of adminNavGroups) for (const item of group.items) expect(resolveAdminNavigation(item.path)?.group.id).toBe(group.id);
  });
});
