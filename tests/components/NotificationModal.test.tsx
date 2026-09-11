// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import NotificationModal from "@/components/common/NotificationModal";

afterEach(cleanup);

describe("NotificationModal", () => {
  it("renders reusable content and invokes the supplied action", () => {
    const onConfirm = vi.fn();

    render(
      <NotificationModal
        open
        title="Xác nhận thao tác"
        message="Nội dung có thể thay đổi theo từng nơi sử dụng."
        actions={[{ label: "Đồng ý", onClick: onConfirm }]}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Xác nhận thao tác" })).toBeInTheDocument();
    expect(screen.getByText("Nội dung có thể thay đổi theo từng nơi sử dụng.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not dismiss a required notification with Escape", () => {
    const onClose = vi.fn();

    render(
      <NotificationModal
        open
        title="Thông báo bắt buộc"
        message="Bạn cần thực hiện hành động để tiếp tục."
        dismissible={false}
        onClose={onClose}
        actions={[{ label: "Tiếp tục", onClick: vi.fn() }]}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
