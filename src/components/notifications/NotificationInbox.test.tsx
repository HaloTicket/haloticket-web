// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "vi" }, t: (key: string) => key }) }));

import { NotificationInbox } from "./NotificationInbox";
import type { NotificationItem } from "@/types";

afterEach(cleanup);

const notices: NotificationItem[] = [
  { id: "n1", userId: "u1", type: "EVENT", title: "Event approved", message: "Summer show is ready", createdAt: new Date().toISOString() },
  { id: "n2", userId: "u1", type: "ALERT", title: "System notice", message: "All services operational", readStatus: true, createdAt: "2020-01-01T12:00:00Z" },
];

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current query">{location.search}</output>;
}

describe("NotificationInbox", () => {
  it("filters the full inbox and selects a notification in the URL", () => {
    const onNotificationClick = vi.fn();
    render(<MemoryRouter><NotificationInbox notifications={notices} onNotificationClick={onNotificationClick} onMarkAllAsRead={vi.fn()} /><LocationProbe /></MemoryRouter>);

    fireEvent.change(screen.getByRole("textbox", { name: "Tìm thông báo" }), { target: { value: "operational" } });
    expect(screen.getByRole("button", { name: /System notice/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Event approved/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Tìm thông báo" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Event approved/ }));

    expect(screen.getByLabelText("Current query")).toHaveTextContent("notificationId=n1");
    expect(onNotificationClick).toHaveBeenCalledWith(notices[0]);
    expect(screen.getByRole("heading", { name: "Event approved" })).toBeInTheDocument();
  });

  it("groups compact notifications and leaves closing behavior to its parent", () => {
    const onNotificationClick = vi.fn();
    render(<MemoryRouter><NotificationInbox compact notifications={notices} onNotificationClick={onNotificationClick} onMarkAllAsRead={vi.fn()} /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Hôm nay" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trước đó" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Event approved/ }));
    expect(onNotificationClick).toHaveBeenCalledWith(notices[0]);
    fireEvent.click(screen.getByRole("button", { name: "Chưa đọc" }));
    expect(screen.getByRole("button", { name: /Event approved/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /System notice/ })).not.toBeInTheDocument();
  });

  it("shows retry and distinguishes a loaded empty inbox", () => {
    const onRetry = vi.fn();
    const props = { notifications: [], onNotificationClick: vi.fn(), onMarkAllAsRead: vi.fn() };
    const { rerender } = render(<MemoryRouter><NotificationInbox {...props} error="Could not load notifications" onRetry={onRetry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<MemoryRouter><NotificationInbox {...props} /></MemoryRouter>);
    expect(screen.getByText("Bạn đã xem hết thông báo.")).toBeInTheDocument();
  });
});
