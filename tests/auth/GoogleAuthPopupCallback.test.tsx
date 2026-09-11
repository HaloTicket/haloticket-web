// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getCurrentToken = vi.fn();
const getCurrentIdToken = vi.fn();
const getCurrentRefreshToken = vi.fn();
const init = vi.fn();
vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({ getCurrentToken, getCurrentIdToken, getCurrentRefreshToken, init }),
}));

import GoogleAuthPopupCallback from "@/features/auth/components/GoogleAuthPopupCallback";

afterEach(() => {
  window.history.replaceState({}, "", "/auth/popup-callback");
  vi.restoreAllMocks();
  getCurrentToken.mockReset();
  getCurrentIdToken.mockReset();
  getCurrentRefreshToken.mockReset();
  init.mockReset();
});

describe("GoogleAuthPopupCallback", () => {
  it("posts the token to the opener and closes the callback popup", async () => {
    init.mockResolvedValue(true);
    getCurrentToken.mockReturnValue("google-token");
    getCurrentIdToken.mockReturnValue("google-id-token");
    getCurrentRefreshToken.mockReturnValue("google-refresh-token");
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", { configurable: true, value: { postMessage } });
    vi.spyOn(window, "close").mockImplementation(() => undefined);

    render(<GoogleAuthPopupCallback />);

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith(
      {
        type: "haloticket-google-auth",
        status: "success",
        token: "google-token",
        idToken: "google-id-token",
        refreshToken: "google-refresh-token",
      },
      window.location.origin,
    ));
    expect(init).toHaveBeenCalledWith({ checkLoginIframe: false, pkceMethod: "S256" });
    expect(window.close).toHaveBeenCalledOnce();
  });

  it("posts cancellation and closes the callback popup after Google returns an error", async () => {
    window.history.replaceState({}, "", "/auth/popup-callback?error=access_denied");
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", { configurable: true, value: { postMessage } });
    vi.spyOn(window, "close").mockImplementation(() => undefined);

    render(<GoogleAuthPopupCallback />);

    await waitFor(() => expect(postMessage).toHaveBeenCalledWith(
      { type: "haloticket-google-auth", status: "cancelled" },
      window.location.origin,
    ));
    expect(window.close).toHaveBeenCalledOnce();
  });
});
