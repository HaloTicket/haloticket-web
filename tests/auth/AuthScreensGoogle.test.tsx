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
