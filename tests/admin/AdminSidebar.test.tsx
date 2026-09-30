// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSidebar } from "../../src/layouts/admin/AdminSidebar";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));
afterEach(cleanup);

describe("AdminSidebar", () => {
  it("keeps a parent item active on a detail route", () => {
    render(<MemoryRouter initialEntries={["/admin/events-approval/EV_123"]}><AdminSidebar collapsed={false} mobileOpen={false} pendingEventsCount={2} onMobileClose={vi.fn()} onExpand={vi.fn()} onToggleCollapse={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Kiểm duyệt sự kiện/ }).getAttribute("aria-current")).toBe("page");
  });

  it("expands a collapsed group to expose its children", async () => {
    const onExpand = vi.fn();
    function Harness() {
      const [collapsed, setCollapsed] = useState(true);
      return <AdminSidebar collapsed={collapsed} mobileOpen={false} pendingEventsCount={null} onMobileClose={vi.fn()} onExpand={(group) => { onExpand(group); setCollapsed(false); }} onToggleCollapse={vi.fn()} />;
    }
    render(<MemoryRouter><Harness /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "KIỂM DUYỆT" }));
    expect(onExpand).toHaveBeenCalledWith("moderation");
    expect(screen.getByRole("link", { name: "Kiểm duyệt sự kiện" }).getAttribute("href")).toBe("/admin/events-approval");
  });

  it("closes the mobile drawer after navigation", async () => {
    const onMobileClose = vi.fn();
    render(<MemoryRouter><AdminSidebar collapsed={false} mobileOpen pendingEventsCount={null} onMobileClose={onMobileClose} onExpand={vi.fn()} onToggleCollapse={vi.fn()} /></MemoryRouter>);
    await userEvent.click(screen.getByRole("link", { name: "Bảng điều khiển" }));
    expect(onMobileClose).toHaveBeenCalled();
  });

  it("closes the mobile drawer with Escape and exposes it as a dialog", async () => {
    const onMobileClose = vi.fn();
    render(<MemoryRouter><AdminSidebar collapsed={false} mobileOpen pendingEventsCount={null} onMobileClose={onMobileClose} onExpand={vi.fn()} onToggleCollapse={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("dialog", { name: "Điều hướng quản trị" }).getAttribute("aria-modal")).toBe("true");
    await userEvent.keyboard("{Escape}");
    expect(onMobileClose).toHaveBeenCalled();
  });

  it("focuses the drawer after it becomes visible and traps Tab from outside", async () => {
    const props = { collapsed: false, pendingEventsCount: null, onMobileClose: vi.fn(), onExpand: vi.fn(), onToggleCollapse: vi.fn() };
    const { container, rerender } = render(<MemoryRouter><AdminSidebar {...props} mobileOpen={false} /></MemoryRouter>);
    const sidebar = container.querySelector("aside")!;
    sidebar.style.visibility = "hidden";
    rerender(<MemoryRouter><AdminSidebar {...props} mobileOpen /></MemoryRouter>);
    const closeButton = sidebar.querySelector<HTMLButtonElement>(".admin-mobile-close")!;
    sidebar.style.visibility = "visible";
    fireEvent.transitionEnd(sidebar, { propertyName: "visibility" });
    expect(document.activeElement).toBe(closeButton);

    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "HaloTicket Admin" }));
    outside.remove();
  });
});
