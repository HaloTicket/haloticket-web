// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { toast } from "sonner";

import { AppToaster } from "@/components/common/AppToaster";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { resetNotificationToastSession } from "@/components/notifications/notificationToastSession";
import { ThemeContext } from "@/context/themeContextDef";
import type { NotificationItem } from "@/types";
import "@/i18n";

afterEach(() => { cleanup(); toast.dismiss(); resetNotificationToastSession(); });

const notification: NotificationItem = { id: "n-1", userId: "admin-1", title: "Yêu cầu duyệt", message: "Sự kiện A chờ duyệt", type: "EVENT", readStatus: false };

function Host({ children }: { children?: React.ReactNode }) {
  return <ThemeContext.Provider value={{ theme: "light", isDark: false, setTheme: vi.fn(), toggleTheme: vi.fn() }}><AppToaster />{children}</ThemeContext.Provider>;
}

describe("shared toaster", () => {
  it("uses one host for task and realtime notifications", async () => {
    render(<Host><NotificationToast toast={notification} onToastClick={vi.fn()} onClose={vi.fn()} /></Host>);
    await waitFor(() => expect(document.querySelectorAll("[data-sonner-toaster]")).toHaveLength(1));
    await waitFor(() => expect(screen.getByText("Yêu cầu duyệt")).toBeInTheDocument());
  });

  it("does not replay the same realtime notification under StrictMode", async () => {
    const onClose = vi.fn();
    const view = render(<StrictMode><Host><NotificationToast toast={notification} onToastClick={vi.fn()} onClose={onClose} /></Host></StrictMode>);
    await waitFor(() => expect(screen.getAllByText("Yêu cầu duyệt")).toHaveLength(1));
    view.rerender(<StrictMode><Host><NotificationToast toast={{ ...notification }} onToastClick={vi.fn()} onClose={onClose} /></Host></StrictMode>);
    expect(screen.getAllByText("Yêu cầu duyệt")).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens detail through the action and leaves the notification unread when dismissed", async () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(<Host><NotificationToast toast={notification} onToastClick={onClick} onClose={onClose} actionText="Xem chi tiết" /></Host>);
    const action = await screen.findByRole("button", { name: "Xem chi tiết" });
    action.click();
    expect(onClick).toHaveBeenCalledWith(notification);
    expect(notification.readStatus).toBe(false);
  });

  it("does not clear a newer notification when an older toast closes", async () => {
    const onClose = vi.fn();
    const view = render(<Host><NotificationToast toast={notification} onToastClick={vi.fn()} onClose={onClose} /></Host>);
    await screen.findByText("Yêu cầu duyệt");
    view.rerender(<Host><NotificationToast toast={{ ...notification, id: "n-2", title: "Thông báo mới" }} onToastClick={vi.fn()} onClose={onClose} /></Host>);
    await screen.findByText("Thông báo mới");
    toast.dismiss("admin-1:n-1");
    await waitFor(() => expect(screen.queryByText("Yêu cầu duyệt")).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
