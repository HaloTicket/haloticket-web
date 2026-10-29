// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Login from "@/features/auth/Login";
import Register from "@/features/auth/Register";

afterEach(cleanup);

describe("Google authentication entry points", () => {
  it("shows password rules only while the registration password has focus", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register onGoogleLogin={vi.fn()} onResendOtp={vi.fn()} onSubmit={vi.fn()} onVerifyOtp={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: "Yêu cầu mật khẩu" })).not.toBeInTheDocument();
    const password = screen.getByLabelText("Mật khẩu", { exact: true });
    await user.click(password);
    expect(screen.getByText("Mật khẩu chưa hợp lệ")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Nhập lại mật khẩu", { exact: true }));
    expect(screen.getByText("Mật khẩu chưa hợp lệ")).toBeInTheDocument();
    await user.type(password, "ValidPass1!");
    expect(screen.getByText("Mật khẩu hợp lệ")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Nhập lại mật khẩu", { exact: true }));
    expect(screen.getByText("Mật khẩu hợp lệ")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Yêu cầu mật khẩu" }).querySelector("ul")).toHaveAttribute("aria-hidden", "true");
  });

  it("starts Google login from the login screen", async () => {
    const user = userEvent.setup();
    const onGoogleLogin = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Login
          onGoogleLogin={onGoogleLogin}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    );

    expect(onGoogleLogin).toHaveBeenCalledOnce();
  });

  it("starts quick Google registration from the registration form", async () => {
    const user = userEvent.setup();
    const onGoogleLogin = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Register
          onGoogleLogin={onGoogleLogin}
          onResendOtp={vi.fn()}
          onSubmit={vi.fn()}
          onVerifyOtp={vi.fn()}
        />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Tiếp tục với Google" }),
    );

    expect(onGoogleLogin).toHaveBeenCalledOnce();
  });
});
