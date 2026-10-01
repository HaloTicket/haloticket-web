// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { resetNotificationToastSession } from "./notificationToastSession";
import { NotificationToast } from "./NotificationToast";

const toastMocks = vi.hoisted(() => ({ info: vi.fn(), dismiss: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMocks }));

const notification = { id: "notice-1", userId: "ADMIN", type: "EVENT", title: "New event", message: "Review" };

beforeEach(() => { resetNotificationToastSession(); vi.clearAllMocks(); });
afterEach(cleanup);

describe("background notification preference", () => {
  it("suppresses an admin toast, dismisses only its ID, and does not replay it on re-enable", () => {
    const onClose = vi.fn();
    const { rerender } = render(<NotificationToast toast={notification} onToastClick={vi.fn()} onClose={onClose} enabled={false} />);
    expect(toastMocks.info).not.toHaveBeenCalled();
    expect(toastMocks.dismiss).toHaveBeenCalledWith("ADMIN:notice-1");
    expect(onClose).toHaveBeenCalled();
    rerender(<NotificationToast toast={notification} onToastClick={vi.fn()} onClose={onClose} enabled />);
    expect(toastMocks.info).not.toHaveBeenCalled();
    expect(toastMocks.dismiss).not.toHaveBeenCalledWith();
  });

  it("keeps background toasts enabled by default for other callers", () => {
    render(<NotificationToast toast={notification} onToastClick={vi.fn()} onClose={vi.fn()} />);
    expect(toastMocks.info).toHaveBeenCalledWith("New event", expect.objectContaining({ id: "ADMIN:notice-1" }));
  });
});
