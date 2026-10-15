// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EventManageSidebar } from "@/features/organizer/event-manage/components/EventManageSidebar";
import { adminNavGroups, resolveAdminNavigation } from "@/features/admin/components/AdminSidebar";

afterEach(cleanup);

it.each(["OWNER", "ADMIN", "MANAGER"])("restores event transfer navigation for %s", (myRole) => {
  render(<MemoryRouter initialEntries={["/organizer/events/event-1/manage/transfers"]}>
    <Routes><Route path="/organizer/events/:eventId/manage/transfers" element={
      <EventManageSidebar myRole={myRole} isSidebarOpen={false} isCollapsed={false} onCloseSidebar={() => {}} onToggleCollapse={() => {}} />
    } /></Routes>
  </MemoryRouter>);
  expect(screen.getByRole("link", { name: "Chuyển nhượng vé" }).getAttribute("href")).toBe("/organizer/events/event-1/manage/transfers");
});

it("does not expose transfer management to check-in staff", () => {
  render(<MemoryRouter><EventManageSidebar myRole="CHECKIN" isSidebarOpen={false} isCollapsed={false} onCloseSidebar={() => {}} onToggleCollapse={() => {}} /></MemoryRouter>);
  expect(screen.queryByRole("link", { name: "Chuyển nhượng vé" })).toBeNull();
});

it("removes system-wide resale and price policies from admin navigation", () => {
  expect(adminNavGroups.some(group => group.items.some(item => item.path.startsWith("/admin/market")))).toBe(false);
  expect(resolveAdminNavigation("/admin/market")).toBeNull();
});
