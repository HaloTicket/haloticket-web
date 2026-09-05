// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthButton } from "@/features/auth/components/GoogleAuthButton";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("GoogleAuthButton", () => {
  it("renders the Google logo and default accessible copy", () => {
    render(<GoogleAuthButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Tiếp tục với Google" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Google" })).toBeInTheDocument();
  });

  it("shows a pending state and prevents duplicate clicks while authenticating", async () => {
    const user = userEvent.setup();
    let resolveAuth: (() => void) | undefined;
    const onClick = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAuth = resolve;
        }),
    );

    render(<GoogleAuthButton onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Tiếp tục với Google" });

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang chuyển đến Google..." })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Đang chuyển đến Google..." }));
    expect(onClick).toHaveBeenCalledTimes(1);

    resolveAuth?.();
    await screen.findByRole("button", { name: "Tiếp tục với Google" });
    expect(screen.getByRole("button", { name: "Tiếp tục với Google" })).toBeEnabled();
  });

  it("renders an authentication error when provided", () => {
    render(<GoogleAuthButton error="Google đang tạm thời không khả dụng." onClick={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Google đang tạm thời không khả dụng.");
  });

  it("does not show an error when the user cancels the Google popup", async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthButton
        onClick={vi.fn().mockRejectedValue(new Error("Google login was cancelled"))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tiếp tục với Google" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a suggested account button when a recent account is provided", () => {
    const account = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
    };

    render(<GoogleAuthButton onClick={vi.fn()} suggestedAccount={account} />);

    const button = screen.getByRole("button", {
      name: "Đăng nhập với tên Trần Công Minh (minhtran2st@gmail.com)",
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập với tên Trần Công Minh")).toBeInTheDocument();
    expect(screen.getByText("minhtran2st@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Google" })).toBeInTheDocument();
  });

  it("loads the suggested account automatically from localStorage", () => {
    window.localStorage.setItem(
      "haloticket_last_google_account",
      JSON.stringify({
        name: "Trần Công Minh",
        email: "minhtran2st@gmail.com",
      }),
    );

    render(<GoogleAuthButton onClick={vi.fn()} />);

    expect(screen.getByText("Đăng nhập với tên Trần Công Minh")).toBeInTheDocument();
    expect(screen.getByText("minhtran2st@gmail.com")).toBeInTheDocument();
  });

  it("renders the account avatar image when picture URL is present", () => {
    const account = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
      picture: "https://example.com/avatar.jpg",
    };

    render(<GoogleAuthButton onClick={vi.fn()} suggestedAccount={account} />);

    const img = screen.getByRole("img", { name: "Trần Công Minh" });
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("triggers onClick and shows pending state when suggested account button is clicked", async () => {
    const user = userEvent.setup();
    let resolveAuth: (() => void) | undefined;
    const onClick = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAuth = resolve;
        }),
    );

    const account = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
    };

    render(<GoogleAuthButton onClick={onClick} suggestedAccount={account} />);
    const button = screen.getByRole("button", {
      name: "Đăng nhập với tên Trần Công Minh (minhtran2st@gmail.com)",
    });

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang chuyển đến Google..." })).toBeDisabled();

    resolveAuth?.();
    await screen.findByRole("button", {
      name: "Đăng nhập với tên Trần Công Minh (minhtran2st@gmail.com)",
    });
  });

  it("cleans platform suffixes like 'HaloTicket' from display name", () => {
    const account = {
      name: "tcminhangiang HaloTicket",
      email: "tcminhangiang@gmail.com",
    };

    render(<GoogleAuthButton onClick={vi.fn()} suggestedAccount={account} />);

    expect(screen.getByText("Đăng nhập với tên tcminhangiang")).toBeInTheDocument();
    expect(screen.queryByText("Đăng nhập với tên tcminhangiang HaloTicket")).not.toBeInTheDocument();
  });

  it("falls back to initials when avatar image fails to load", () => {
    const account = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
      picture: "https://example.com/broken-avatar.jpg",
    };

    render(<GoogleAuthButton onClick={vi.fn()} suggestedAccount={account} />);

    const img = screen.getByRole("img", { name: "Trần Công Minh" });
    fireEvent.error(img);

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("updates the suggested account dynamically when google-account-updated event fires", async () => {
    render(<GoogleAuthButton onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Tiếp tục với Google" })).toBeInTheDocument();

    const newAccount = {
      name: "Trần Công Minh",
      email: "minhtran2st@gmail.com",
    };

    window.localStorage.setItem("haloticket_last_google_account", JSON.stringify(newAccount));
    window.dispatchEvent(new CustomEvent("google-account-updated", { detail: newAccount }));

    expect(await screen.findByText("Đăng nhập với tên Trần Công Minh")).toBeInTheDocument();
    expect(screen.getByText("minhtran2st@gmail.com")).toBeInTheDocument();
  });
});
