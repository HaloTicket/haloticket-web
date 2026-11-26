// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import type { NotificationItem } from "@/types";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }) }));
afterEach(cleanup);

const now = new Date().toISOString();
const older = new Date(Date.now() - 6 * 86400000).toISOString();
const notifications: NotificationItem[] = [
  { id: "shared", userId: "ADMIN", type: "EVENT_UPDATED", title: "Cập nhật sự kiện", message: "Cần xem xét", createdAt: now },
  { id: "personal", userId: "user-1", type: "SYSTEM_ANNOUNCEMENT", title: "Bảo trì", message: "Dòng một\n<strong>Dòng hai</strong>", priority: "URGENT", createdAt: now },
  { id: "organizer", userId: "user-1", type: "ORGANIZER_ANNOUNCEMENT", source: "ORGANIZER", eventTitle: "Vietnam Game Expo", category: "PROMOTION", title: "Giảm giá vé", message: "Ưu đãi", priority: "IMPORTANT", readStatus: true, createdAt: older },
];

function setup(props: Partial<React.ComponentProps<typeof NotificationInbox>> = {}) {
  const handlers = { onMarkAsRead: vi.fn(), onDelete: vi.fn().mockResolvedValue(true), onNotificationClick: vi.fn(), onMarkAllAsRead: vi.fn() };
  render(<MemoryRouter><NotificationInbox compact notifications={notifications} {...handlers} {...props} /></MemoryRouter>);
  return handlers;
}

it("keeps mark-read and delete inside the item menu and shows a plain text announcement", () => {
  const { onMarkAsRead, onDelete, onNotificationClick } = setup();

  expect(screen.queryByRole("button", { name: "Xóa thông báo" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Đánh dấu đã đọc" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thao tác: Bảo trì" }));
  expect(screen.getByRole("menuitem", { name: "Đánh dấu đã đọc" })).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "Xóa thông báo" }));
  expect(onDelete).toHaveBeenCalledExactlyOnceWith("personal");
  expect(screen.queryByRole("menu")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /^Từ HaloTicket · Hệ thống\s*Bảo trì/ }));
  const detail = screen.getByRole("article", { name: "Chi tiết thông báo" });
  expect(within(detail).getByText("Khẩn cấp")).toBeTruthy();
  expect(detail.textContent).toContain("<strong>Dòng hai</strong>");
  expect(detail.querySelector("strong")).toBeNull();
  expect(onMarkAsRead).not.toHaveBeenCalled();
  expect(onNotificationClick).not.toHaveBeenCalled();
});

it("preserves unread status when opening a row or detail in full inbox and only marks read via explicit menu or mark-all", () => {
  const onMarkAsRead = vi.fn();
  const onMarkAllAsRead = vi.fn();
  const onNotificationClick = vi.fn();
  render(<MemoryRouter><NotificationInbox notifications={notifications} onNotificationClick={onNotificationClick} onMarkAllAsRead={onMarkAllAsRead} onMarkAsRead={onMarkAsRead} /></MemoryRouter>);

  fireEvent.click(screen.getByRole("button", { name: /^Từ HaloTicket · Hệ thống\s*Bảo trì/ }));
  expect(screen.getByRole("article", { name: "Chi tiết thông báo" }).textContent).toContain("Bảo trì");
  expect(onMarkAsRead).not.toHaveBeenCalled();
  expect(onNotificationClick).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getAllByRole("button", { name: "Thao tác: Bảo trì" })[0]);
  fireEvent.click(screen.getByRole("menuitem", { name: "Đánh dấu đã đọc" }));
  expect(onMarkAsRead).toHaveBeenCalledExactlyOnceWith("personal");

  fireEvent.click(screen.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }));
  expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
});

it("never offers deletion for the shared admin notification and marks it read from the menu", () => {
  const { onMarkAsRead } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Thao tác: Cập nhật sự kiện" }));
  expect(screen.queryByRole("menuitem", { name: "Xóa thông báo" })).toBeNull();
  fireEvent.click(screen.getByRole("menuitem", { name: "Đánh dấu đã đọc" }));
  expect(onMarkAsRead).toHaveBeenCalledExactlyOnceWith("shared");
});

it("closes the item menu with Escape without closing the surrounding panel and restores focus", () => {
  const outer = vi.fn();
  render(<div onKeyDown={outer}><MemoryRouter><NotificationInbox compact notifications={notifications} onNotificationClick={vi.fn()} onMarkAllAsRead={vi.fn()} onMarkAsRead={vi.fn()} /></MemoryRouter></div>);
  const trigger = screen.getByRole("button", { name: "Thao tác: Bảo trì" });
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  fireEvent.keyDown(screen.getByRole("menuitem", { name: "Đánh dấu đã đọc" }), { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(outer).not.toHaveBeenCalled();
});

it("groups by day, labels the source and promotions, and filters Important to include Urgent", () => {
  setup();
  expect(screen.getByRole("heading", { name: "Hôm nay" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Trước đó" })).toBeTruthy();
  expect(screen.getByText("Từ BTC · Vietnam Game Expo")).toBeTruthy();
  expect(screen.getByText("Quảng bá & ưu đãi")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Quan trọng" }));
  expect(screen.getByText("Bảo trì")).toBeTruthy();
  expect(screen.getByText("Giảm giá vé")).toBeTruthy();
  expect(screen.queryByText("Cập nhật sự kiện")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /Chưa đọc/ }));
  expect(screen.queryByText("Giảm giá vé")).toBeNull();
});

it("treats a notification without a source as HaloTicket", () => {
  setup();
  expect(screen.getByText("Từ HaloTicket · Sự kiện")).toBeTruthy();
});

it("shows the Internal badge and organizer source consistently for staff visibility and INTERNAL category", () => {
  const staffNotifications: NotificationItem[] = [
    {
      id: "staff-vis",
      userId: "user-1",
      type: "ORGANIZER_ANNOUNCEMENT",
      source: "ORGANIZER",
      eventTitle: "GenZania",
      category: "EVENT_UPDATE",
      visibility: "STAFF",
      title: "Phân công cổng A",
      message: "Có mặt trước 17:00",
      createdAt: now,
    },
    {
      id: "staff-cat",
      userId: "user-1",
      type: "ORGANIZER_ANNOUNCEMENT",
      eventTitle: "GenZania",
      category: "INTERNAL",
      title: "Họp nội bộ",
      message: "Phòng điều hành",
      createdAt: now,
    },
  ];
  setup({ notifications: staffNotifications });
  expect(screen.getAllByText("Nội bộ")).toHaveLength(2);
  expect(screen.getAllByText("Từ BTC · GenZania")).toHaveLength(2);
});
