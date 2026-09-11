// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SessionExpiredModalHost from "@/features/auth/components/SessionExpiredModalHost";

afterEach(cleanup);

describe("SessionExpiredModalHost", () => {
  it("asks the user to log in again when the session expires", async () => {
    const onLoginAgain = vi.fn().mockResolvedValue(undefined);
    render(<SessionExpiredModalHost onLoginAgain={onLoginAgain} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("session-expired"));
    });

    expect(screen.getByRole("dialog", { name: "Phiên đăng nhập đã hết hạn" })).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng đăng nhập lại để tiếp tục/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập lại" }));

    await waitFor(() => expect(onLoginAgain).toHaveBeenCalledOnce());
  });
});
