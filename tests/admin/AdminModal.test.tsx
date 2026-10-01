// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import "@/i18n";

afterEach(cleanup);

describe("admin dialogs", () => {
  it("focuses the dialog, traps tab, and restores focus on close", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.append(trigger);
    trigger.focus();
    const view = render(<AdminModal title="Chi tiết" onClose={onClose}><button>Trong hộp</button></AdminModal>);
    expect(screen.getByRole("dialog", { name: "Chi tiết" })).toContainElement(document.activeElement as HTMLElement);
    await user.tab();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });

  it("keeps a required dialog open on Escape", () => {
    const onClose = vi.fn();
    render(<AdminModal title="Lỗi cần xử lý" onClose={onClose} dismissible={false}>Hãy đăng nhập lại</AdminModal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Lỗi cần xử lý" })).toBeInTheDocument();
  });

  it("starts on cancel and blocks duplicate destructive confirmation while pending", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const view = render(<AdminConfirmModal title="Xóa địa điểm A" subtitle="Sự kiện liên kết sẽ mất địa điểm" confirmText="Xóa địa điểm" onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByRole("alertdialog", { name: "Xóa địa điểm A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hủy/i })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /hủy/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    view.rerender(<AdminConfirmModal title="Xóa địa điểm A" subtitle="Sự kiện liên kết sẽ mất địa điểm" confirmText="Xóa địa điểm" pending onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByRole("button", { name: "Xóa địa điểm" })).toBeDisabled();
  });

  it("keeps initial focus off a destructive action when already pending", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = render(<AdminConfirmModal title="Xóa địa điểm A" pending onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("alertdialog")).toHaveFocus();
    view.unmount();
    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });
});
