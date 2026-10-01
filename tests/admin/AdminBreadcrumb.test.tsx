// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminBreadcrumb } from "../../src/layouts/admin/AdminBreadcrumb";
import { resolveAdminNavigation } from "../../src/layouts/admin/adminNavigation";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));
afterEach(cleanup);

describe("admin route metadata", () => {
  it("resolves an event detail to its parent navigation item", () => {
    const route = resolveAdminNavigation("/admin/events-approval/EV_123");
    expect(route?.item.path).toBe("/admin/events-approval");
    expect(route?.eventId).toBe("EV_123");
  });

  it("shows the group, parent and event ID for a detail route", () => {
    render(<MemoryRouter initialEntries={["/admin/events-approval/EV_123"]}><AdminBreadcrumb /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Kiểm duyệt sự kiện" }).getAttribute("href")).toBe("/admin/events-approval");
    expect(screen.getByText(/EV_123/).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Quản lý sự kiện" }).getAttribute("href")).toBe("/admin/events");
  });

  it("shows a group landing page once with normal title capitalization", () => {
    render(<MemoryRouter initialEntries={["/admin/events"]}><AdminBreadcrumb /></MemoryRouter>);
    expect(screen.getAllByText("Quản lý sự kiện")).toHaveLength(1);
    expect(screen.getByText("Quản lý sự kiện").getAttribute("aria-current")).toBe("page");
  });

  it("makes unknown routes explicit", () => {
    render(<MemoryRouter initialEntries={["/admin/not-real"]}><AdminBreadcrumb /></MemoryRouter>);
    expect(screen.getByText("Không tìm thấy trang").getAttribute("aria-current")).toBe("page");
  });

  it("does not crash on a malformed event ID", () => {
    expect(resolveAdminNavigation("/admin/events-approval/%ZZ")?.eventId).toBe("%ZZ");
  });
});
